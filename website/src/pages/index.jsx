import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className={clsx("hero__title", styles.heroTitle)}>
          <img 
            src="/FS25-Community-LUADOC/img/fs25-logo.png" 
            alt="FS25"
            className={styles.heroLogo}
          />
          <span className={styles.heroTitleText}>Community LUADOC</span>
        </h1>
        <p className={clsx("hero__subtitle", styles.heroSubtitle)}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className={clsx(styles.customButton, "button button--secondary button--lg")}
            to="/engine">
            <span className={styles.buttonText}>Browse Engine Docs</span>
          </Link>
          <Link
            className={clsx(styles.customButton, "button button--secondary button--lg")}
            to="/foundation">
            <span className={styles.buttonText}>Browse Foundation Docs</span>
          </Link>
          <Link
            className={clsx(styles.customButton, "button button--secondary button--lg")}
            to="/script">
            <span className={styles.buttonText}>Browse Script Docs</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function AnimatedNumber({ value, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation when component mounts
    setIsVisible(true);
    
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };
    
    // Small delay before starting animation
    const timeout = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [value, duration]);

  // Format number with commas
  const formattedCount = count.toLocaleString();

  return <span className={isVisible ? styles.animatedNumber : ''}>{formattedCount}</span>;
}

function StatsSection() {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <div className={styles.statCard}>
              <h2><AnimatedNumber value={1661} /></h2>
              <p>Total Pages</p>
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.statCard}>
              <h2><AnimatedNumber value={11102} /></h2>
              <p>Total Script Functions</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OfficialGameSection() {
  return (
    <section className={styles.officialGame}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Official Game Resources</h2>
        <p className={styles.sectionDescription}>
          Official Farming Simulator resources and Giants Software information
        </p>
        <div className={styles.streamingCards}>
          <a 
            href="https://www.farming-simulator.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.streamingCard}
            style={{backgroundImage: 'url(/FS25-Community-LUADOC/img/fs.png)'}}>
            <div className={styles.cardOverlay}>
              <h3>Farming Simulator 25</h3>
              <p>Official game website and information</p>
            </div>
          </a>
          <a 
            href="https://www.giants-software.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.streamingCard}
            style={{backgroundImage: 'url(/FS25-Community-LUADOC/img/gs.png)'}}>
            <div className={styles.cardOverlay}>
              <h3>Giants Software</h3>
              <p>Developer information and resources</p>
            </div>
          </a>
          <a 
            href="https://gdn.giants-software.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.streamingCard}
            style={{backgroundImage: 'url(/FS25-Community-LUADOC/img/ge.png)'}}>
            <div className={styles.cardOverlay}>
              <h3>GDN</h3>
              <p>Giants Developer Network - documentation, forum, and tools</p>
            </div>
          </a>
          <a 
            href="https://www.farming-simulator.com/mods.php" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.streamingCard}
            style={{backgroundImage: 'url(/FS25-Community-LUADOC/img/mh.png)'}}>
            <div className={styles.cardOverlay}>
              <h3>ModHub</h3>
              <p>Official modding platform and resources</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Comprehensive documentation for all Lua scripting APIs available in Farming Simulator 25">
      <HomepageHeader />
      <main>
        <StatsSection />
        <OfficialGameSection />
      </main>
    </Layout>
  );
}


