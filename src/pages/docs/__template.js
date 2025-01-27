import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import useBaseUrl from '@docusaurus/useBaseUrl';

import Heading from '@theme/Heading';
import styles from '../index.module.css';

export default function Home() {
  return (
    <Layout title="docs">
	    <div className="container docs-container padding-top--md padding-bottom--lg">
        <div className="row">
          <div className="col docs-left-col">
            <div id="header">
              <div id="version-content" />
            </div>
            <div id="body-content" />
          </div>
          <div className="col col--3">
            <div className="docs-toc">
              <div id="toc-content" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
