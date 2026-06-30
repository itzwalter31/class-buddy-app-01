import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Create a user profile in the users table after signup
 */
export async function createUserProfile(user: User, fullName?: string) {
  try {
    const { error } = await supabase.from("users").insert([
      {
        id: user.id,
        email: user.email || "",
        full_name: fullName || user.user_metadata?.full_name || null,
        role: "teacher",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    school_name?: string;
    avatar_url?: string;
  }
) {
  try {
    const { error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
