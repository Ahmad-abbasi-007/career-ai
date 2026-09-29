"use client";

import { useEffect, useState } from "react";
import { account, ID } from "@/lib/appwrite";
import type { Models } from "appwrite";

export function useAuth() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  async function getCurrentUser() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function register(
    name: string,
    email: string,
    password: string
  ) {
    await account.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });

    await account.createEmailPasswordSession({
      email,
      password,
    });

    await getCurrentUser();
  }

  async function login(email: string, password: string) {
    await account.createEmailPasswordSession({
      email,
      password,
    });

    await getCurrentUser();
  }

  async function logout() {
    await account.deleteSession({
      sessionId: "current",
    });

    setUser(null);
  }

  useEffect(() => {
    getCurrentUser();
  }, []);

  return {
    user,
    loading,
    register,
    login,
    logout,
  };
}