
import React, { useState, useRef } from 'react';
import type { UserProfile } from '../types';
import { Grape, User, Mail, Camera, Image as ImageIcon } from 'lucide-react';
import { Spinner } from './Spinner';

interface SignUpProps {
    onSignUp: (profile: UserProfile) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSignUp }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError("Image file is too large. Please choose a file smaller than 2MB.");
                return;
            }
            setError(null);
            setAvatarFile(file);
            
            // Convert to data URL for persistent storage in localStorage
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!name || !email || !avatarFile || !avatarPreview) {
            setError("Please fill out all fields and upload a profile picture.");
            return;
        }
        setLoading(true);
        // The avatarPreview is now a base64 data URL, which is persistent.
        onSignUp({
            name,
            email,
            avatarUrl: avatarPreview,
        });
        // No need to setLoading(false) as the component will unmount
    };

    const isFormValid = name && email && avatarFile;

    return (
        <div className="min-h-screen bg-teal-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center">
                    <Grape size={48} className="mx-auto text-teal-500" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">Join NutriSnap</h1>
                    <p className="text-gray-500 dark:text-gray-400">Create your account to start your health journey.</p>
                </div>

                <div
                    className="relative w-28 h-28 mx-auto rounded-full border-2 border-dashed border-teal-300 dark:border-teal-700 flex items-center justify-center cursor-pointer hover:bg-teal-50 dark:hover:bg-gray-700/50 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    aria-label="Upload profile picture"
                >
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-gray-400 dark:text-gray-500">
                           <ImageIcon size={32} className="mx-auto" />
                           <p className="text-xs mt-1">Upload Photo</p>
                        </div>
                    )}
                     <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                            required
                        />
                    </div>
                     <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                            required
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={!isFormValid || loading}
                        className="w-full bg-teal-500 text-white font-bold py-3 px-8 rounded-full hover:bg-teal-600 transition-transform transform hover:scale-105 disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? <Spinner /> : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};
