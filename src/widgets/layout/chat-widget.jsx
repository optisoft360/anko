import { useCallback, useEffect, useState } from "react";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import projectService from "@/services/projectService";
import { ChatPanel } from "@/widgets/layout/chat-panel";
import { ChatFab } from "@/widgets/layout/chat-fab";

/**
 * Chat button + panel, only for members allowed to query the active company's documents.
 * The backend decides (per company, from Admin Area > Roles): employees and auditors, who
 * take the courses/batteries, get a 403 and never see the chat. No active company = no chat.
 */
export function ChatWidget() {
  const { activeCompanyId } = useEnterprise();
  const [access, setAccess] = useState({ companyId: null, allowed: false, documents: [] });

  const load = useCallback(async (companyId) => {
    try {
      const documents = await projectService.getChatDocuments(companyId);
      setAccess({ companyId, allowed: true, documents });
    } catch {
      setAccess({ companyId, allowed: false, documents: [] });
    }
  }, []);

  useEffect(() => {
    setAccess({ companyId: null, allowed: false, documents: [] });
    if (activeCompanyId) load(activeCompanyId);
  }, [activeCompanyId, load]);

  if (!access.allowed || String(access.companyId) !== String(activeCompanyId)) return null;

  return (
    <>
      <ChatPanel companyId={access.companyId} documents={access.documents} onOpen={() => load(access.companyId)} />
      <ChatFab />
    </>
  );
}

export default ChatWidget;
