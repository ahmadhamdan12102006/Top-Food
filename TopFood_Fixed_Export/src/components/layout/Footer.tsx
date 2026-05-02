import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { adminGetSettings } from '../../services/adminService';

const Footer: React.FC = () => {
  const [links, setLinks] = useState({
    whatsapp: '#',
    instagram: '#',
    snapchat: '#',
    tiktok: '#'
  });
  const [description, setDescription] = useState('أحلي وجبات الخليل على بابك');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await adminGetSettings();
        if (settings) {
          if (settings.socialLinks) {
            setLinks({
              whatsapp: settings.socialLinks.whatsapp || '#',
              instagram: settings.socialLinks.instagram || '#',
              snapchat: settings.socialLinks.snapchat || '#',
              tiktok: settings.socialLinks.tiktok || '#'
            });
          }
          if (settings.welcomeMessage) {
            setDescription(settings.welcomeMessage);
          }
        }
      } catch (error) {
        console.error('Failed to load footer settings', error);
      }
    };

    loadSettings();
  }, []);

  return (
    <footer className="border-t-4 border-primary-main bg-surface-light dark:bg-surface-dark py-8 px-4 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand Group */}
        <div className="flex flex-col items-center md:items-start text-center md:text-right gap-2">
          <span className="text-3xl font-black text-primary-main">Top Food</span>
          <p className="text-text-light/80 dark:text-text-dark/80 font-medium text-center md:text-right max-w-xs">
            {description}
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 font-semibold text-sm">
          <NavLink to="/" className="hover:text-primary-main transition">
            الرئيسية
          </NavLink>
          <NavLink to="/menu" className="hover:text-primary-main transition">
            المطبخ
          </NavLink>
          <NavLink to="/contact" className="hover:text-primary-main transition">
            تواصل معنا
          </NavLink>
        </div>

        {/* Social Meta */}
        <div className="flex gap-4">
          {/* WhatsApp */}
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-[#25D366] hover:text-white transition shadow-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href={links.instagram}
            target="_blank"
            rel="noreferrer"
            title="Instagram"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-[#E4405F] hover:text-white transition shadow-sm"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>

          {/* Snapchat */}
          <a
            href={links.snapchat}
            target="_blank"
            rel="noreferrer"
            title="Snapchat"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-[#FFFC00] hover:text-black transition shadow-sm"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.75c-3.5 0-5 2.2-5 4.5 0 .5.1.9.1.9s-.4-.1-.6-.1c-.9 0-1.5.7-1.5 1.5 0 .6.4 1.1.9 1.4-1.2.4-2.1 1.5-2.1 2.8 0 .8.4 1.5 1 2 .2.2.4.3.6.4-.1.4-.2.9-.2 1.4 0 2.2 2.1 4 4.8 4h4c2.7 0 4.8-1.8 4.8-4 0-.5-.1-1-.2-1.4.2-.1.4-.2.6-.4.6-.5 1-1.2 1-2 0-1.3-.9-2.4-2.1-2.8.5-.3.9-.8.9-1.4 0-.8-.6-1.5-1.5-1.5-.2 0-.6.1-.6.1s.1-.4.1-.9c0-2.3-1.5-4.5-5-4.5z" />
            </svg>
          </a>

          {/* TikTok */}
          <a
            href={links.tiktok}
            target="_blank"
            rel="noreferrer"
            title="TikTok"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-[#000000] hover:text-white transition shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1 .05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-8 text-center text-sm font-medium opacity-60">
        © 2026 Top Food – Burger & More
      </div>
    </footer>
  );
};

export default Footer;