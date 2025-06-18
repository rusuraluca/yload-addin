import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskPane from './TaskPane';
import { AuthProvider, useAuth } from '../contexts/AuthContext'; // Assuming AuthProvider is needed
import config from '../config';

// Mock Office.js
global.Office = {
  onReady: jest.fn((callback) => callback({ host: Office.HostType.Outlook })),
  HostType: {
    Outlook: 'Outlook',
    Excel: 'Excel',
  },
  AsyncResultStatus: {
    Succeeded: 'succeeded',
    Failed: 'failed',
  },
  context: {
    mailbox: {
      item: null, // Default to null, tests will override
    },
    auth: { // For potential SSO patterns if ever used
        getAccessToken: jest.fn(),
    }
  },
};

// Mock useAuth
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'), // Import and retain default behavior
  useAuth: jest.fn(),
}));

// Mock config
jest.mock('../config', () => ({
  apiBaseUrl: 'https://mockapi.yload.eu',
  authUrl: 'https://mockauth.yload.eu/graphql'
}));

// Mock global.fetch
global.fetch = jest.fn();


describe('TaskPane Component', () => {
  let mockMailboxItem;
  const mockTokens = {
    token: 'test-token',
    userId: 'test-user-id',
    userName: 'Test User',
  };

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      tokens: mockTokens,
      logout: jest.fn(),
      fetchUserData: jest.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
    });

    // Default mock mailbox item
    mockMailboxItem = {
      from: { emailAddress: 'sender@example.com', displayName: 'Test Sender' },
      attachments: [],
      subject: 'Test Subject',
      body: {
        getAsync: jest.fn((coercionType, callback) => {
          callback({ status: Office.AsyncResultStatus.Succeeded, value: 'Test email body' });
        }),
      },
      getAttachmentContentAsync: jest.fn(),
    };
    Office.context.mailbox.item = mockMailboxItem;

    // Default fetch mock for opportunities (empty)
    (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v1/crm/opportunities')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ count: 0, rows: [] }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  const renderComponent = () => {
    return render(
      <AuthProvider> {/* Render with AuthProvider if TaskPane relies on it, or provide mock directly */}
        <TaskPane />
      </AuthProvider>
    );
  };

  describe('Attachment Filtering (loadAttachments)', () => {
    it('should load only non-inline attachments', async () => {
      const attachments = [
        { id: '1', name: 'attachment1.pdf', isInline: false, size: 100, contentType: 'application/pdf' },
        { id: '2', name: 'image.png', isInline: true, size: 50, contentType: 'image/png' },
        { id: '3', name: 'attachment2.docx', isInline: false, size: 150, contentType: 'application/msword' },
      ];
      mockMailboxItem.attachments = attachments;
      Office.context.mailbox.item = mockMailboxItem;

      renderComponent();

      // Wait for attachments to be processed and displayed
      await waitFor(() => {
        expect(screen.getByText('attachment1.pdf (0 KB)')).toBeInTheDocument();
        expect(screen.queryByText('image.png (0 KB)')).not.toBeInTheDocument();
        expect(screen.getByText('attachment2.docx (0 KB)')).toBeInTheDocument();
      });

      // Also check internal state if possible (requires more advanced setup or exposing state, not standard for RTL)
      // For now, checking displayed elements is a good proxy.
    });

    it('should handle cases with no attachments', async () => {
      mockMailboxItem.attachments = [];
      Office.context.mailbox.item = mockMailboxItem;

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No attachments found')).toBeInTheDocument();
      });
    });

    it('should handle item.attachments being undefined', async () => {
      mockMailboxItem.attachments = undefined;
      Office.context.mailbox.item = mockMailboxItem;

      renderComponent();

      await waitFor(() => {
        // Based on the updated code, it should clear attachments and loading state
        expect(screen.getByText('No attachments found')).toBeInTheDocument();
      });
    });
  });

  describe('Context Handling (useEffect initial data loading)', () => {
    it('should clear/reset fields if Office.context.mailbox.item is null', async () => {
      Office.context.mailbox.item = null;
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Customer Email:/i)).toHaveValue('');
        expect(screen.getByLabelText(/Customer Name:/i)).toHaveValue('');
        expect(screen.getByLabelText(/Email Content:/i)).toHaveValue('');
        expect(screen.getByText('No attachments found')).toBeInTheDocument();
      });
    });

    it('should handle undefined item.from gracefully', async () => {
      mockMailboxItem.from = undefined;
      Office.context.mailbox.item = mockMailboxItem;
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Customer Email:/i)).toHaveValue('');
        expect(screen.getByLabelText(/Customer Name:/i)).toHaveValue('');
        // Check console.warn was called (requires spyOn(console, 'warn'))
      });
    });

    it('should handle undefined item.body gracefully', async () => {
      mockMailboxItem.body = undefined;
      Office.context.mailbox.item = mockMailboxItem;
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Content:/i)).toHaveValue('');
        // Check console.warn was called
      });
    });
  });

  describe('Error Handling in API calls and Office methods', () => {
    it('should set status if item.body.getAsync fails', async () => {
      mockMailboxItem.body.getAsync = jest.fn((coercionType, callback) => {
        callback({ status: Office.AsyncResultStatus.Failed, error: { message: 'Test error', code: 123 } });
      });
      Office.context.mailbox.item = mockMailboxItem;

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Could not retrieve email content.')).toBeInTheDocument();
      });
    });

    it('should set status if fetchOpportunities fails', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v1/crm/opportunities')) {
            return Promise.resolve({
                ok: false,
                statusText: 'Server Error',
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load opportunities')).toBeInTheDocument();
      });
    });

    it('should set status if fetchOpportunityDetails fails', async () => {
      // Setup to select an opportunity first to trigger fetchOpportunityDetails
      const opportunities = [{ id: 'opp1', name: 'Test Opp', account: { legalEntityName: 'Test Acc' } }];
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v1/crm/opportunities') && !url.includes(opportunities[0].id)) { // Initial load
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ count: 1, rows: opportunities }),
            });
        } else if (url.includes(`/api/v1/crm/opportunities/${opportunities[0].id}`)) { // Detail load
             return Promise.resolve({
                ok: false,
                statusText: 'Server Error on Detail',
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderComponent();

      // Wait for opportunities to load and select to appear
      await screen.findByRole('option', { name: /Test Opp - Test Acc/i });

      // Wait for the error status from fetchOpportunityDetails
      await waitFor(() => {
        expect(screen.getByText('Failed to load opportunity details.')).toBeInTheDocument();
      });
    });
  });
});

// Helper to wrap component in AuthProvider if needed by actual component context access
// For this example, useAuth is directly mocked.
// const renderWithAuthProvider = (component) => {
//   return render(<AuthProvider>{component}</AuthProvider>);
// };
// Example usage: renderWithAuthProvider(<TaskPane />);
// However, mocking useAuth directly is often cleaner for unit tests.

// Note: This is conceptual test code. Actual execution would require:
// 1. Jest and React Testing Library setup.
// 2. Proper configuration for moduleNameMapper for CSS/assets if not handled by CRA/equivalent.
// 3. Potentially more detailed mocking for child components if they interfere with TaskPane's unit tests.
// 4. `localStorage` mock if not provided by Jest's JSDOM environment by default.
// 5. Fine-tuning waitFor/findBy queries for robustness.
// 6. Spying on console.warn/error for some tests.
// 7. Ensuring that any state updates that cause re-renders are properly handled with `act()`.
//    Many RTL queries implicitly use `act` for single updates. For complex interactions, explicit `act` might be needed.
// 8. The component uses Tailwind classes directly in JSX. These don't affect Jest/RTL tests directly
//    as they operate on the DOM structure and component logic, not visual styling.
// 9. `useEffect` calls with async operations inside: tests need `waitFor` or `findBy*` to ensure
//    effects have completed and UI has updated.
//10. Ensure the AuthContext mock provides all necessary values that TaskPane might consume.
//    The current mock provides tokens, isAuthenticated, logout, and fetchUserData.
//11. The initial fetchOpportunities is called in useEffect. Tests need to account for this.
//    The default fetch mock handles this by returning empty opportunities.
//12. Error messages in setStatus should exactly match what's in the component.
//    E.g., "Failed to load opportunity details." vs "Failed to load opportunity details" (no period).
//    The tests assume the period is present as per the latest code modifications.
//13. The test for `fetchOpportunityDetails` failure is more complex because it depends on `selectedOpportunity` state.
//    The test simulates this by first successfully loading opportunities, which sets the first one as selected,
//    then making the subsequent detail fetch fail.
