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
          <h1>This page has been moved <a href="./release_023/docs">here</a></h1>
        </div>
      </div>
    </Layout>
  );
}
