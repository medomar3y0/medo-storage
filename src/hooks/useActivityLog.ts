import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  actionType: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
}

export const useActivityLog = () => {
  const logActivity = async ({
    actionType,
    targetType,
    targetId,
    targetName,
    details,
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        details: details,
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  return { logActivity };
};
