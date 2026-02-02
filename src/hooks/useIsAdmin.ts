import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const useIsAdmin = (user: User | null) => {
  const [isAdmin, setIsAdmin] = useState(false);
  // Start with loading=true if we might have a user
  const [loading, setLoading] = useState(true);
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // If user is null, we're done loading
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Prevent double-checking
      if (checkingRef.current) {
        return;
      }
      checkingRef.current = true;

      // Ensure loading is true before we start
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          console.log("Admin check result:", data);
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
        checkingRef.current = false;
      }
    };

    checkAdminStatus();
  }, [user?.id]); // Only re-run when user.id changes

  // If user exists but we haven't finished checking yet, keep loading true
  const effectiveLoading = user ? loading : false;

  return { isAdmin, loading: effectiveLoading };
};
