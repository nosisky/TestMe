/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import styles from './Footer.module.scss';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <span>© {new Date().getFullYear()} TestMe. All rights reserved.</span>
        <div className={styles.authorInfo}>
          <span>Created by <a href="https://www.linkedin.com/in/abdulrasaq-nas/" target="_blank" rel="noopener noreferrer">Nas Abdulrasaq</a></span>
          <span>Star on <a href="https://github.com/nosisky/testme" target="_blank" rel="noopener noreferrer">GitHub</a></span>
        </div>
      </div>
    </footer>
  );
} 