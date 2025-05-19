/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import { useState, useEffect } from 'react';
import {
  FacebookShareButton, TwitterShareButton, WhatsappShareButton,
  TelegramShareButton, LinkedinShareButton, EmailShareButton,
  FacebookIcon, TwitterIcon, WhatsappIcon,
  TelegramIcon, LinkedinIcon, EmailIcon
} from 'react-share';
import styles from './SocialShareButtons.module.scss';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
}

export default function SocialShareButtons({ url, title, description, hashtags = [] }: SocialShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState<string>(url);
  const [isCopied, setIsCopied] = useState(false);
  const iconSize = 36;

  useEffect(() => {
    // Make sure we have an absolute URL
    if (typeof window !== 'undefined') {
      const isAbsoluteUrl = url.startsWith('http') || url.startsWith('//');
      const fullUrl = isAbsoluteUrl ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
      setShareUrl(fullUrl);
    }
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL: ', error);
    }
  };

  if (typeof window === 'undefined') {
    return null; // Don't render on server
  }

  return (
    <div className={styles.socialShareContainer}>
      <h3 className={styles.shareTitle}>Share this quiz:</h3>
      <div className={styles.buttonsWrapper}>
        <FacebookShareButton 
          url={shareUrl} 
          hashtag={hashtags?.length ? `#${hashtags[0]}` : undefined}
        >
          <FacebookIcon size={iconSize} round />
        </FacebookShareButton>

        <TwitterShareButton url={shareUrl} title={title} hashtags={hashtags}>
          <TwitterIcon size={iconSize} round />
        </TwitterShareButton>

        <WhatsappShareButton url={shareUrl} title={title}>
          <WhatsappIcon size={iconSize} round />
        </WhatsappShareButton>

        <TelegramShareButton url={shareUrl} title={title}>
          <TelegramIcon size={iconSize} round />
        </TelegramShareButton>

        <LinkedinShareButton url={shareUrl} title={title} summary={description}>
          <LinkedinIcon size={iconSize} round />
        </LinkedinShareButton>

        <EmailShareButton url={shareUrl} subject={title} body={description}>
          <EmailIcon size={iconSize} round />
        </EmailShareButton>

        <button 
          onClick={handleCopy} 
          className={styles.copyButton}
          aria-label="Copy link to clipboard"
        >
          {isCopied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
} 