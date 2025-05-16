"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import styles from "./profile.module.scss";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className={styles.profileContainer}>
      <Header />
      
      <main className={styles.profileMain}>
        <div className={styles.profileHeader}>
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
          <h1>Your Profile</h1>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileImageSection}>
            {session?.user?.image ? (
              <Image 
                src={session.user.image} 
                alt={session.user.name || "Profile"} 
                width={120} 
                height={120} 
                className={styles.profileImage}
              />
            ) : (
              <div className={styles.profileImageFallback}>
                {session?.user?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          
          <div className={styles.profileDetails}>
            <div className={styles.profileField}>
              <label>Name</label>
              <p>{session?.user?.name || "Not provided"}</p>
            </div>
            
            <div className={styles.profileField}>
              <label>Email</label>
              <p>{session?.user?.email || "Not provided"}</p>
            </div>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h2>Account Settings</h2>
          <p className={styles.comingSoon}>
            More profile settings and customization options coming soon!
          </p>
        </div>
      </main>
    </div>
  );
} 