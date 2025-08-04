'use client';

import { useEffect, useRef, useState } from 'react';
import type { DrivePickerElement } from '@googleworkspace/drive-picker-element';

export default function GoogleDrivePicker() {
  const pickerRef = useRef<DrivePickerElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [googleOAuthToken, setGoogleOAuthToken] = useState<string | null>(null);

    async function handleFilePicked(fileId: string, token: string) {
        console.log("Sending file to backend:", fileId, token);
        
    }

  useEffect(() => {
    import('@googleworkspace/drive-picker-element').then(() => {
      setIsReady(true); // now safe to call methods
      const picker = pickerRef.current;
      if (!picker) return;

      const handleAuthenticated = (e: Event) => {
        const token = (e as CustomEvent).detail.token as string;
        console.log("OAuth Token:", token); // for debugging
        setGoogleOAuthToken(token);
      };

      const handlePicked = (e: Event) => {
        const pickedFile = (e as CustomEvent).detail.docs?.[0];
        if (pickedFile && googleOAuthToken) {
          console.log("Picked File ID:", pickedFile.id);
          handleFilePicked(pickedFile.id, googleOAuthToken);
        }
      };

      picker.addEventListener("picker:authenticated", handleAuthenticated);
      picker.addEventListener("picker:picked", handlePicked);

      return () => {
        picker.removeEventListener("picker:authenticated", handleAuthenticated);
        picker.removeEventListener("picker:picked", handlePicked);
      };
    });
  }, [googleOAuthToken]);

  const handleOpenPicker = () => {
    if (isReady && pickerRef.current) {
      pickerRef.current.visible = true;
    }
  };

  return (
    <div>
      <button
        onClick={handleOpenPicker}
        disabled={!isReady}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isReady ? '#1a73e8' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isReady ? 'pointer' : 'not-allowed',
          marginBottom: '1rem',
        }}
      >
        Open Drive Picker
      </button>

      <drive-picker
        ref={pickerRef}
        app-id={process.env.NEXT_PUBLIC_GOOGLE_APP_ID!}
        client-id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
      >
        <drive-picker-docs-view starred="true" />
      </drive-picker>
    </div>
  );
}