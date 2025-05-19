/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
"use client";
import styles from "./MobileNavToggle.module.scss";

interface MobileNavToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MobileNavToggle({ isOpen, onClick }: MobileNavToggleProps) {
  return (
    <button
      className={`${styles.toggle} ${isOpen ? styles.open : ""}`}
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <span />
      <span />
      <span />
    </button>
  );
} 