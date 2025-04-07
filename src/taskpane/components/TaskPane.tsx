import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

interface Attachment {
    id: string;
    name: string;
    size: number;
    contentType: string;
    isInline: boolean;
    content?: string;
}

const TaskPane: React.FC = () => {
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [context, setContext] = useState('');
    const [status, setStatus] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const { tokens, logout } = useAuth();

    useEffect(() => {
        Office.onReady((info) => {
            if (info.host === Office.HostType.Outlook) {
                const item = Office.context.mailbox.item;

                // Get email body
                item.body.getAsync(Office.CoercionType.Text, function (result) {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        setContext(result.value);
                    } else {
                        setStatus('Could not retrieve email content');
                    }
                });

                // Get sender info
                if (item.from) {
                    setCustomerEmail(item.from.emailAddress);
                    setCustomerName(item.from.displayName || 'Unknown');
                } else {
                    setStatus('Could not retrieve customer details');
                }

                // Get attachments
                loadAttachments(item);
            }
        });
    }, []);

    const loadAttachments = (item: Office.MessageRead) => {
        if (!item.attachments || item.attachments.length === 0) {
            return;
        }

        setIsLoadingAttachments(true);
        const attachmentsInfo: Attachment[] = [];

        // Process each attachment
        item.attachments.forEach((attachment, _) => {
            attachmentsInfo.push({
                id: attachment.id,
                name: attachment.name,
                size: attachment.size,
                contentType: attachment.contentType,
                isInline: attachment.isInline
            });
        });

        setAttachments(attachmentsInfo);
        setIsLoadingAttachments(false);
    };

    const toggleAttachmentSelection = (attachmentId: string) => {
        setSelectedAttachments(prev => {
            if (prev.includes(attachmentId)) {
                return prev.filter(id => id !== attachmentId);
            } else {
                return [...prev, attachmentId];
            }
        });
    };

    const getAttachmentContent = async (attachmentId: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            Office.context.mailbox.item?.getAttachmentContentAsync(
                attachmentId,
                { asyncContext: attachmentId },
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        const content = result.value.content;
                        resolve(content); // Base64 encoded content
                    } else {
                        reject(new Error(`Failed to get attachment: ${result.error.message}`));
                    }
                }
            );
        });
    };

    const getCustomer = async () => {
        const agentId = tokens?.userId;
        setStatus('Processing...');

        try {
            // Get content for selected attachments
            const attachmentData: { id: string, name: string, content: string }[] = [];

            for (const attachmentId of selectedAttachments) {
                const attachment = attachments.find(att => att.id === attachmentId);
                if (attachment) {
                    try {
                        const content = await getAttachmentContent(attachmentId);
                        attachmentData.push({
                            id: attachmentId,
                            name: attachment.name,
                            content
                        });
                    } catch (error) {
                        console.error(`Error getting attachment ${attachmentId}:`, error);
                    }
                }
            }

            const response = await fetch(config.yloadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens?.token}`
                },
                body: JSON.stringify({
                    agentId,
                    email: customerEmail,
                    name: customerName,
                    notes,
                    context,
                    attachments: attachmentData
                }),
                redirect: 'follow'
            });

            if (response.ok) {
                setStatus('Client added successfully');
            } else {
                setStatus('Failed to send request');
            }
        } catch (error) {
            console.error('Error:', error);
            setStatus('Error sending request');
        }
    };

    return (
        <div className="bg-gray-100 p-4">
            <div className="max-w-md mx-auto bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">Customer Details</h1>
                        <button
                            onClick={logout}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded"
                        >
                            Logout
                        </button>
                    </div>

                    <div className="mb-4 space-y-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email:</label>
                            <p className="text-gray-600">{customerEmail}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name:</label>
                            <p className="text-gray-600">{customerName}</p>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes:</label>
                            <textarea
                                id="notes"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Add your notes here..."
                            />
                        </div>
                        <div>
                            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">Context:</label>
                            <textarea
                                id="context"
                                rows={5}
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Attachments Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments:</label>
                            {isLoadingAttachments ? (
                                <p className="text-sm text-gray-500">Loading attachments...</p>
                            ) : attachments.length > 0 ? (
                                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                                    {attachments.map(attachment => (
                                        <div key={attachment.id} className="flex items-center p-2 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                id={`attachment-${attachment.id}`}
                                                checked={selectedAttachments.includes(attachment.id)}
                                                onChange={() => toggleAttachmentSelection(attachment.id)}
                                                className="mr-2"
                                            />
                                            <label htmlFor={`attachment-${attachment.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                                                {attachment.name} ({Math.round(attachment.size / 1024)} KB)
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No attachments found</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={getCustomer}
                        disabled={isLoadingAttachments}
                        className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${isLoadingAttachments ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Get Customer to Yload
                    </button>

                    {status && (
                        <div className="mt-4 text-center">
                            <p className={`text-sm ${status === 'Processing...' ? 'text-blue-600' : status.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                                {status}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskPane;