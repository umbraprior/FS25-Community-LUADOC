import React from 'react';
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
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/engine">
            Browse Engine Docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/foundation">
            Browse Foundation Docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/script">
            Browse Script Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

function StatsSection() {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <div className={styles.statCard}>
              <h2>1,661</h2>
              <p>Total Pages</p>
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.statCard}>
              <h2>11,102</h2>
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
          Links to official Farming Simulator 25 resources and Giants Software information
        </p>
        <div className="row">
          <div className="col col--4">
            <div className={styles.linkCard}>
              <h3>Farming Simulator 25</h3>
              <p>Official game website and information</p>
              <div className={styles.linkCardLinks}>
                <a 
                  href="https://www.farming-simulator.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="button button--outline button--primary">
                  Official Website
                </a>
              </div>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.linkCard}>
              <h3>Giants Software</h3>
              <p>Developer information and resources</p>
              <div className={styles.linkCardLinks}>
                <a 
                  href="https://www.giants-software.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="button button--outline button--primary">
                  Giants Software
                </a>
              </div>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.linkCard}>
              <h3>ModHub</h3>
              <p>Official modding platform and resources</p>
              <div className={styles.linkCardLinks}>
                <a 
                  href="https://www.farming-simulator.com/mods.php" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="button button--outline button--primary">
                  Visit ModHub
                </a>
              </div>
            </div>
          </div>
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


