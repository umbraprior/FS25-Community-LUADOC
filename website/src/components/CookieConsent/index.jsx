import React, {useState, useEffect} from 'react';
import styles from './styles.module.css';

const COOKIE_CONSENT_KEY = 'fs25-cookie-consent';
const COOKIE_CONSENT_VERSION = '1.0';

export default function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if user has already given consent
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            // Small delay to avoid flash on page load
            const timer = setTimeout(() => {
                setShowBanner(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        // Store consent with version and timestamp
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
            accepted: true,
            version: COOKIE_CONSENT_VERSION,
            timestamp: Date.now()
        }));
        setShowBanner(false);
    };

    const declineCookies = () => {
        // Store that user declined
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
            accepted: false,
            version: COOKIE_CONSENT_VERSION,
            timestamp: Date.now()
        }));
        setShowBanner(false);
    };

    if (!showBanner) {
        return null;
    }

    return (
        <div className={styles.cookieBanner} role="banner" aria-live="polite">
            <div className={styles.cookieContent}>
                <div className={styles.cookieText}>
                    <h3 className={styles.cookieTitle}>Cookie Preferences</h3>
                    <p className={styles.cookieDescription}>
                        We use cookies to enhance your browsing experience, analyze site traffic, and personalize
                        content.
                        By clicking "Accept All", you consent to our use of cookies. You can also choose to decline
                        non-essential cookies.
                    </p>
                </div>
                <div className={styles.cookieActions}>
                    <button
                        className={styles.acceptButton}
                        onClick={acceptCookies}
                        aria-label="Accept all cookies"
                    >
                        Accept All
                    </button>
                    <button
                        className={styles.declineButton}
                        onClick={declineCookies}
                        aria-label="Decline non-essential cookies"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}

