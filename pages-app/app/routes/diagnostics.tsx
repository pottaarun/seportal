import { useState, useEffect } from "react";

export function meta() {
  return [
    { title: "Diagnostics - SolutionHub" },
    { name: "description", content: "System diagnostics" },
  ];
}

export default function Diagnostics() {
  const [apiTest, setApiTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const results: any = {
        timestamp: new Date().toISOString(),
        currentURL: window.location.href,
        tests: {}
      };

      // Test 1: Check API connectivity
      try {
        const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/url-assets');
        results.tests.apiConnectivity = {
          status: res.ok ? 'PASS' : 'FAIL',
          httpStatus: res.status,
          assetsCount: res.ok ? (await res.json()).length : 0
        };
      } catch (e: any) {
        results.tests.apiConnectivity = {
          status: 'FAIL',
          error: e.message
        };
      }

      // Test 2: Check user API with encoded email
      try {
        const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/users/apotta%40cloudflare.com');
        const data = await res.json();
        results.tests.userAPI = {
          status: res.ok && data.name ? 'PASS' : 'FAIL',
          httpStatus: res.status,
          userData: data
        };
      } catch (e: any) {
        results.tests.userAPI = {
          status: 'FAIL',
          error: e.message
        };
      }

      // Test 3: Check localStorage
      results.tests.localStorage = {
        user: localStorage.getItem('seportal_user'),
        userName: localStorage.getItem('seportal_user_name'),
      };

      // Test 4: Check which bundles are loaded
      results.bundles = {
        scripts: Array.from(document.querySelectorAll('script[src]')).map((s: any) => s.src),
        hasAPIModule: window.location.pathname === '/diagnostics' // Just a placeholder
      };

      setApiTest(results);
      setLoading(false);
    };

    runTests();
  }, []);

  if (loading) {
    return <div>Running diagnostics...</div>;
  }

  return (
    <div>
      <h2>🔍 System Diagnostics</h2>
      <p>Debug information for troubleshooting</p>

      <div style={{ marginTop: '2rem' }}>
        <h3>Test Results</h3>
        <pre style={{
          background: 'var(--bg-tertiary)',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {JSON.stringify(apiTest, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Quick Tests</h3>
        <button onClick={() => window.location.reload()}>Reload Page</button>
        <button onClick={() => {
          localStorage.clear();
          alert('LocalStorage cleared!');
        }} style={{ marginLeft: '1rem' }}>
          Clear LocalStorage
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Expected Values</h3>
        <ul style={{ fontSize: '14px' }}>
          <li>API Connectivity: Should show PASS with 5+ assets</li>
          <li>User API: Should show PASS with name "Arun Potta"</li>
          <li>URL should be: https://seportal.pages.dev/diagnostics</li>
        </ul>
      </div>
    </div>
  );
}
