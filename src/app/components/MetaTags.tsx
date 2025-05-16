'use client';

import { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

export default function MetaTags({ title, description, url, imageUrl }: MetaTagsProps) {
  // Next.js Head component doesn't work in app router, 
  // so we need to set meta tags manually
  useEffect(() => {
    // Set title
    document.title = title;
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', description);
      document.head.appendChild(metaDescription);
    }
    
    // Set Open Graph meta tags
    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:title', content: title },
      { property: 'twitter:description', content: description },
      { property: 'twitter:url', content: url }
    ];
    
    // Add image if available
    if (imageUrl) {
      metaTags.push(
        { property: 'og:image', content: imageUrl },
        { property: 'twitter:image', content: imageUrl }
      );
    }
    
    // Set each meta tag
    metaTags.forEach(tag => {
      let meta = document.querySelector(`meta[property="${tag.property}"]`);
      if (meta) {
        meta.setAttribute('content', tag.content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        meta.setAttribute('content', tag.content);
        document.head.appendChild(meta);
      }
    });
    
    // Clean up function to reset title
    return () => {
      // We can't easily reset all meta tags but we can reset title
      document.title = 'TestMe | Generate AI-powered quizzes from any content';
    };
  }, [title, description, url, imageUrl]);
  
  return null; // This component doesn't render anything
} 