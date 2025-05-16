"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileNavToggle from "./MobileNavToggle";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import styles from "./Header.module.scss";
import { useSession } from "next-auth/react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isAuthenticated = !!session;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle Escape key to close the menu
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMenuOpen) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <Link href={isAuthenticated ? "/dashboard" : "/"} className={styles.logo}>
        <Image src="/logo.svg" alt="TestMe Logo" width={28} height={28} />
        <span className={styles.brand}>TestMe</span>
      </Link>

      <div className={styles.headerRight}>
        <nav className={styles.desktopNav}>
          {isAuthenticated ? (
            // Navigation for authenticated users
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/create">Create Quiz</Link>
            </>
          ) : (
            // Navigation for unauthenticated users (landing page)
            <>
              <Link href="/#features">Features</Link>
              <Link href="/#how">How it works</Link>
            </>
          )}
        </nav>

        <div className={styles.rightSection}>
          {!isAuthenticated && (
            <div className={styles.loginWrapper}>
              <LoginButton />
            </div>
          )}
          {isAuthenticated && <UserMenu />}
          <div ref={toggleRef} className={styles.mobileOnly}>
            <MobileNavToggle isOpen={isMenuOpen} onClick={toggleMenu} />
          </div>
        </div>
      </div>

      {isMenuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      <nav 
        ref={menuRef}
        className={`${styles.mobileNav} ${isMenuOpen ? styles.navOpen : ''}`}
        aria-hidden={!isMenuOpen}
        role="navigation"
      >
        {isAuthenticated ? (
          // Navigation for authenticated users
          <>
            <Link href="/dashboard" onClick={closeMenu}>Dashboard</Link>
            <Link href="/dashboard/create/youtube" onClick={closeMenu}>Create Quiz</Link>
            <div className={styles.mobileOnlyUserMenu}>
              <UserMenu />
            </div>
          </>
        ) : (
          // Navigation for unauthenticated users (landing page)
          <>
            <Link href="/#features" onClick={closeMenu}>Features</Link>
            <Link href="/#how" onClick={closeMenu}>How it works</Link>
            <div className={styles.loginWrapper}>
              <LoginButton />
            </div>
          </>
        )}
      </nav>
    </header>
  );
} 