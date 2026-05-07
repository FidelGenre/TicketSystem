'use client';

import { useLang } from '@/context/LanguageContext';
import { HiOutlineMail, HiOutlinePhone, HiOutlineLocationMarker } from 'react-icons/hi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

export default function ContactPage() {
  const { t } = useLang();

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0b1a2e] mb-4">{t('contactPageTitle')}</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('contactSubtitle')}</p>
          <div className="w-24 h-1 bg-primary-500 mx-auto rounded-full mt-6"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <HiOutlinePhone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('contactOnline')}</h3>
                <p className="text-gray-600 font-medium">{t('contactPhone')}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 shrink-0 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                <HiOutlineLocationMarker className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('contactAddress')}</h3>
                <p className="text-gray-600 font-medium mb-1">{t('contactAddressText1')}</p>
                <p className="text-gray-500 text-sm">{t('contactAddressText2')}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 shrink-0 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <HiOutlineMail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('contactEmailTitle')}</h3>
                <p className="text-gray-600 font-medium">{t('contactEmail')}</p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 flex flex-col h-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contactFollowUs')}</h2>
            
            <div className="flex gap-4 mb-10">
              <a href="#" className="w-14 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200">
                <FaWhatsapp className="w-7 h-7" />
              </a>
              <a href="#" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-pink-200">
                <FaInstagram className="w-7 h-7" />
              </a>
            </div>

            <div className="mt-auto bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
              <p className="text-sm text-blue-700 font-medium">
                {t('contactOnline') === 'Contacto en línea' 
                  ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'
                  : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
