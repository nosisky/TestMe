"use client";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import styles from "./LoginButton.module.scss";

interface LoginButtonProps {
  className?: string;
}

export default function LoginButton({ className }: LoginButtonProps = {}) {
  const { status } = useSession();
  return (
    <button
      className={`${styles.loginBtn} ${className || ''}`}
      onClick={() => signIn("google")}
      disabled={status === "loading"}
    >
      <Image src="/google.svg" alt="Google" width={20} height={20} />
      {status === "loading" ? "Loading..." : "Sign in with Google"}
    </button>
  );
} 