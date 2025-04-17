import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import config from "../config";

interface Attachment {
    id: string;
    name: string;
    size: number;
    contentType: string;
    isInline: boolean;
    content?: string;
}

interface Opportunity {
    id: string;
    name: string;
    account: {
        legalEntityName: string;
    };
    contentBlocks?: any[];
}

interface OpportunityResponse {
    count: number;
    rows: Opportunity[];
}

interface FileUploadResponse {
    id: string;
    name: string;
    fileType: string;
    parentEntity: string;
    parentEntityId: string;
    description: string;
    bucketS3: string;
    fileKey: string;
    fileSize: number;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    deletedAt: null;
    deletedById: null;
    contentBlocks: null;
    additionalFields: null;
    entityHistory: null;
    following: null;
    metadata: null;
    parentDirectoryId: null;
    sharedWith: null;
}

const TaskPane: React.FC = () => {
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [notes, setNotes] = useState("");
    const [context, setContext] = useState("");
    const [status, setStatus] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState("");
    const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [detailedOpportunity, setDetailedOpportunity] = useState<any>(null);
    const { tokens, logout, fetchUserData } = useAuth();
    const [currentUserName, setCurrentUserName] = useState<string>("");

    useEffect(() => {
        Office.onReady((info) => {
            if (info.host === Office.HostType.Outlook) {
                const item = Office.context.mailbox.item;

                item.body.getAsync(Office.CoercionType.Text, function (result) {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        setContext(result.value);
                    } else {
                        setStatus("Could not retrieve email content");
                    }
                });

                if (item.from) {
                    setCustomerEmail(item.from.emailAddress);
                    setCustomerName(item.from.displayName || "Unknown");
                } else {
                    setStatus("Could not retrieve customer details");
                }

                loadAttachments(item);
            }
        });

        if (tokens?.token) {
            if (!tokens.userName) {
                fetchUserData().then(() => {
                    if (tokens.userName) {
                        setCurrentUserName(tokens.userName);
                    }
                    fetchOpportunities();
                });
            } else {
                setCurrentUserName(tokens.userName);
                fetchOpportunities();
            }
        }
    }, [tokens]);

    useEffect(() => {
        if (selectedOpportunity) {
            fetchOpportunityDetails(selectedOpportunity);
        }
    }, [selectedOpportunity]);

    const fetchOpportunities = async () => {
        if (!tokens?.token) return;

        setIsLoadingOpportunities(true);
        try {
            const response = await fetch(`${config.apiBaseUrl}/api/v1/crm/opportunities`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokens.token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data: OpportunityResponse = await response.json();
                setOpportunities(data.rows);
                if (data.rows.length > 0) {
                    setSelectedOpportunity(data.rows[0].id);
                }
            } else {
                console.error("Failed to fetch opportunities");
                setStatus("Failed to load opportunities");
            }
        } catch (error) {
            console.error("Error fetching opportunities:", error);
            setStatus("Error loading opportunities");
        } finally {
            setIsLoadingOpportunities(false);
        }
    };

    const fetchOpportunityDetails = async (opportunityId: string) => {
        if (!tokens?.token) return;

        try {
            const response = await fetch(
                `${config.apiBaseUrl}/api/v1/crm/opportunities/${opportunityId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${tokens.token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setDetailedOpportunity(data);
            } else {
                console.error("Failed to fetch opportunity details");
                setStatus("Failed to load opportunity details");
            }
        } catch (error) {
            console.error("Error fetching opportunity details:", error);
        }
    };

    const loadAttachments = (item: Office.MessageRead) => {
        if (!item.attachments || item.attachments.length === 0) {
            return;
        }

        setIsLoadingAttachments(true);
        const attachmentsInfo: Attachment[] = [];

        item.attachments.forEach((attachment) => {
            attachmentsInfo.push({
                id: attachment.id,
                name: attachment.name,
                size: attachment.size,
                contentType: attachment.contentType,
                isInline: attachment.isInline,
            });
        });

        setAttachments(attachmentsInfo);
        setIsLoadingAttachments(false);
    };

    const toggleAttachmentSelection = (attachmentId: string) => {
        setSelectedAttachments((prev) => {
            if (prev.includes(attachmentId)) {
                return prev.filter((id) => id !== attachmentId);
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

    const uploadAttachment = async (
        content: string,
        name: string,
        opportunityId: string
    ): Promise<FileUploadResponse> => {
        // Convert base64 to blob
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);

        const formData = new FormData();
        formData.append("file", blob, name);
        formData.append("description", "Uploaded from email");
        formData.append("parentEntity", "CRM_OPPORTUNITIES");
        formData.append("parentEntityId", opportunityId);
        formData.append("isPublic", "false");

        const response = await fetch(`${config.apiBaseUrl}/api/v1/helper/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokens?.token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        return await response.json();
    };

    const getEmailSubject = (): Promise<string> => {
        return new Promise((resolve) => {
            try {
                const item = Office.context.mailbox.item;
                if (item) {
                    resolve(item.subject || "No Subject");
                } else {
                    resolve("Email");
                }
            } catch (error) {
                console.error("Error getting email subject:", error);
                resolve("Email");
            }
        });
    };

    const processOpportunity = async () => {
        if (!selectedOpportunity) {
            setStatus("Please select an opportunity");
            return;
        }

        if (!tokens || !tokens.userId) {
            setStatus("User information not available");
            return;
        }

        setIsProcessing(true);
        setStatus("Processing...");

        try {
            if (!detailedOpportunity || !detailedOpportunity.contentBlocks) {
                throw new Error("Opportunity details not available");
            }

            const emailSubject = await getEmailSubject();

            const uploadedFiles: FileUploadResponse[] = [];

            if (selectedAttachments.length > 0) {
                for (const attachmentId of selectedAttachments) {
                    const attachment = attachments.find((att) => att.id === attachmentId);
                    if (attachment) {
                        const content = await getAttachmentContent(attachmentId);
                        const fileResponse = await uploadAttachment(
                            content,
                            attachment.name,
                            selectedOpportunity
                        );
                        uploadedFiles.push(fileResponse);
                    }
                }
            }

            const emailContent = context || "No email content available";
            const formattedNote = `
                ${notes ? notes + "\n\n" : ""}
                Email from: ${customerName} <${customerEmail}>
                Subject: ${emailSubject}
                Date: ${new Date().toLocaleString()}

                Email content:
                ${emailContent}
                `;

            const newContentBlock = {
                id: `${Math.random().toString(36).substring(2, 15)}`,
                type: "Note",
                data: {
                    noteType: "General",
                    comment: formattedNote.trim(),
                },
                files: uploadedFiles,
                comments: [],
                expanded: false,
                createdDate: new Date().toISOString(),
                user: {
                    id: tokens.userId,
                    name: tokens.userName,
                }
            };

            const updatedBlocks = [newContentBlock, ...detailedOpportunity.contentBlocks];

            const response = await fetch(`${config.apiBaseUrl}/api/v1/crm/opportunities/${selectedOpportunity}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${tokens.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contentBlocks: updatedBlocks,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update opportunity: ${response.statusText}`);
            }

            await fetchOpportunityDetails(selectedOpportunity);

            setStatus(`Note with ${uploadedFiles.length} attachment(s) added successfully to opprtunity!`);
        } catch (error) {
            console.error("Error processing opportunity:", error);
            setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        {currentUserName && (
                            <p className="text-sm text-gray-600">Hi {currentUserName}</p>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Email:
                            </label>
                            <input
                                id="customerEmail"
                                type="text"
                                value={customerEmail}
                                readOnly
                                className="w-full px-3 py-2 text-gray-700 border rounded-lg bg-gray-100"
                            />
                        </div>

                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Name:
                            </label>
                            <input
                                id="customerName"
                                type="text"
                                value={customerName}
                                readOnly
                                className="w-full px-3 py-2 text-gray-700 border rounded-lg bg-gray-100"
                            />
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                                Notes:
                            </label>
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
                            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Content:
                            </label>
                            <textarea
                                id="context"
                                rows={5}
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="opportunity" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Opportunity:
                            </label>
                            {isLoadingOpportunities ? (
                                <p className="text-sm text-gray-500">Loading opportunities...</p>
                            ) : opportunities.length > 0 ? (
                                <select
                                    id="opportunity"
                                    value={selectedOpportunity}
                                    onChange={(e) => setSelectedOpportunity(e.target.value)}
                                    className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                                >
                                    {opportunities.map((opp) => (
                                        <option key={opp.id} value={opp.id}>
                                            {opp.name} - {opp.account.legalEntityName}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-gray-500">No opportunities available</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments:</label>
                            {isLoadingAttachments ? (
                                <p className="text-sm text-gray-500">Loading attachments...</p>
                            ) : attachments.length > 0 ? (
                                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                                    {attachments.map((attachment) => (
                                        <div key={attachment.id} className="flex items-center p-2 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                id={`attachment-${attachment.id}`}
                                                checked={selectedAttachments.includes(attachment.id)}
                                                onChange={() => toggleAttachmentSelection(attachment.id)}
                                                className="mr-2"
                                            />
                                            <label
                                                htmlFor={`attachment-${attachment.id}`}
                                                className="text-sm text-gray-700 cursor-pointer flex-1"
                                            >
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
                        onClick={processOpportunity}
                        disabled={
                            isProcessing || isLoadingAttachments || isLoadingOpportunities || !selectedOpportunity
                        }
                        className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${isProcessing || isLoadingAttachments || isLoadingOpportunities || !selectedOpportunity ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {isProcessing ? "Processing..." : "Add Email to Opportunity"}
                    </button>

                    {status && (
                        <div className="mt-4 text-center">
                            <p
                                className={`text-sm ${status === "Processing..." ? "text-blue-600" : status.includes("successfully") ? "text-green-600" : "text-red-600"}`}
                            >
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