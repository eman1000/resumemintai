import { auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";

export const withAuth = async (init?: RequestInit) => {

   const user =
     auth.currentUser ||
     (await new Promise<any>((res) => onAuthStateChanged(auth, (u) => res(u))));
    const token = user ? await user.getIdToken() : "";
    return {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
      },
    };
  };