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
        <div id="docs-header">
          <div id="version-content" />
        </div>
        <div className="row docs-row">
          <div className="col col--3">
            <div className="docs-toc">
              <div id="toc-content" />
            </div>
          </div>
          <div className="col docs-left-col">
            <div id="body-content" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
