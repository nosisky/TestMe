"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNavToggle from "./MobileNavToggle";
import LoginButton from "./LoginButton";
import UserMenu from "./UserMenu";
import styles from "./Header.module.scss";
import { useSession, signOut } from "next-auth/react";

interface HeaderProps {
  currentPage?: string;
}

export default function Header({ currentPage }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const router = useRouter();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  const handleLogout = async () => {
    try {
      // Close menu first for better UX
      closeMenu();
      
      // Perform the actual logout
      await signOut({ 
        redirect: false,
      });
      
      // Then manually redirect to homepage
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
              <Link href="/dashboard" className={currentPage === 'dashboard' ? styles.activeLink : ''}>Dashboard</Link>
              <Link href="/dashboard" className={currentPage === 'create' ? styles.activeLink : ''}>Create Quiz</Link>
            </>
          ) : (
            // Navigation for unauthenticated users (landing page)
            <>
              <Link href="/#features" className={currentPage === 'features' ? styles.activeLink : ''}>Features</Link>
              <Link href="/#how" className={currentPage === 'how' ? styles.activeLink : ''}>How it works</Link>
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
            <Link href="/dashboard" onClick={closeMenu}>Create a Quiz</Link>
            <Link href="/dashboard/my-quizzes" onClick={closeMenu}>My Quizzes</Link>
            <Link href="/dashboard/profile" onClick={closeMenu}>Profile</Link>
            <div className={styles.divider}></div>
            <div className={styles.mobileOnlyUserMenu}>
              <button 
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
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