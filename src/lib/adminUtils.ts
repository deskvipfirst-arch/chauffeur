import { auth, db } from "@/lib/supabase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "@/lib/supabase-auth";
import { doc, setDoc, getDoc } from "@/lib/supabase-db";
import { canonicalizeUserRole, isAllowedRole } from "./roles";

export async function createAdminUser(email: string, password: string) {
  try {
    // Create the user in Supabase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create the user document in Firestore with admin role
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "admin",
    });

    return { success: true, user };
  } catch (error: any) {
    console.error("Error creating admin user:", error);
    throw new Error(error.message || "Failed to create admin user");
  }
}

export { canonicalizeUserRole, isAllowedRole } from "./roles";

export async function getUserRole(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;
    return canonicalizeUserRole(userDoc.data().role || null);
  } catch (error) {
    console.error("Error checking user role:", error);
    return null;
  }
}

export async function isAdminUser(userId: string) {
  const role = await getUserRole(userId);
  return isAllowedRole(role, ["admin"]);
}

export async function isGreeterUser(userId: string) {
  const role = await getUserRole(userId);
  return isAllowedRole(role, ["greeter", "admin"]);
}

// Function to create the first admin user
export async function createFirstAdminUser(email: string, password: string) {
  try {
    let userCredential;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      const code = String(error?.code || "").toLowerCase();
      const accountExists = code === "auth/email-already-in-use" || message.includes("already registered");

      if (!accountExists) {
        throw error;
      }

      userCredential = await signInWithEmailAndPassword(auth, email, password);
    }

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "admin",
    });

    return { success: true, user };
  } catch (error: any) {
    console.error("Error creating first admin user:", error);
    throw new Error(error.message || "Failed to create first admin user");
  }
} 