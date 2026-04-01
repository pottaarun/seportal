import { useState, useEffect } from 'react';
import './rfx.css';

export function meta() {
  return [
    { title: 'RFx Responses - SolutionHub' },
    { name: 'description', content: 'Generate RFP/RFI responses using AI' },
  ];
}

interface QuestionAnswer {
  question: string;
  answer: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  rowIndex?: number;
}

export default function RFx() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'answer' | 'training'>('answer');
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk');
  const [documentText, setDocumentText] = useState('');
  const [qaList, setQaList] = useState<QuestionAnswer[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number>(-1);
  const [answerColumn, setAnswerColumn] = useState<number>(-1);
  const [dataStartRow, setDataStartRow] = useState<number>(1);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [excelHeaderRow, setExcelHeaderRow] = useState<number>(0);
  const [docUpdateStatus, setDocUpdateStatus] = useState<string>('');
  const [docUpdateLoading, setDocUpdateLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [rfpUploading, setRfpUploading] = useState(false);
  const [rfpUploadStatus, setRfpUploadStatus] = useState<string>('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [uploadedRfps, setUploadedRfps] = useState<any[]>([]);
  const [loadingRfps, setLoadingRfps] = useState(false);
  const [clearingDocs, setClearingDocs] = useState(false);
  const [clearDocsStatus, setClearDocsStatus] = useState<string>('');
  const [docsLastUpdated, setDocsLastUpdated] = useState<string | null>(null);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'application-security',
    'network-services',
    'developer-platform',
    'application-performance',
    'sase',
    'workplace-security'
  ]);

  const categories = [
    { id: 'application-security', label: 'Application Security' },
    { id: 'network-services', label: 'Network Services' },
    { id: 'developer-platform', label: 'Developer Platform' },
    { id: 'application-performance', label: 'Application Performance' },
    { id: 'sase', label: 'SASE' },
    { id: 'workplace-security', label: 'Workplace Security' }
  ];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  useEffect(() => {
    const savedStatus = localStorage.getItem('rfx-doc-update-status');
    const savedTimestamp = localStorage.getItem('rfx-doc-last-updated');
    if (savedStatus) setDocUpdateStatus(savedStatus);
    if (savedTimestamp) setLastUpdated(savedTimestamp);

    // Fetch actual doc stats from the API
    fetch('https://seportal-api.arunpotta1024.workers.dev/api/admin/doc-stats')
      .then(res => res.json())
      .then((data: any) => {
        if (data.lastUpdated) setDocsLastUpdated(data.lastUpdated);
        if (data.docCount) setDocsCount(data.docCount);
      })
      .catch(() => {});

    // Fetch RFx stats (questions answered)
    fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/stats')
      .then(res => res.json())
      .then((data: any) => {
        if (data.questionsAnswered != null) setQuestionsAnswered(data.questionsAnswered);
      })
      .catch(() => {});
  }, []);

  const handleLoadUploadedRfps = async () => {
    setLoadingRfps(true);
    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/uploaded-rfps', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: any = await res.json();
      if (res.ok) {
        setUploadedRfps(data.uploads || []);
      }
    } catch (err) {
      console.error('Error loading RFPs:', err);
    } finally {
      setLoadingRfps(false);
    }
  };

  const handleDeleteRfp = async (fileName: string) => {
    if (!confirm(`Delete all entries from "${fileName}"?`)) return;
    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/delete-rfp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      const data: any = await res.json();
      if (res.ok) {
        alert(`✓ Deleted ${data.deletedCount} entries`);
        handleLoadUploadedRfps();
      } else {
        alert(`✗ Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`✗ Error: ${err.message}`);
    }
  };

  const handleClearDocs = async () => {
    if (!confirm('Clear all documentation from the database?')) return;
    setClearingDocs(true);
    setClearDocsStatus('Clearing...');
    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/admin/clear-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: any = await res.json();
      if (res.ok) {
        setClearDocsStatus(`✓ ${data.message}`);
        setLastUpdated('');
        setDocUpdateStatus('');
        localStorage.removeItem('rfx-doc-last-updated');
        localStorage.removeItem('rfx-doc-update-status');
      } else {
        setClearDocsStatus(`✗ Error: ${data.error}`);
      }
    } catch (err: any) {
      setClearDocsStatus(`✗ Error: ${err.message}`);
    } finally {
      setClearingDocs(false);
      setTimeout(() => setClearDocsStatus(''), 5000);
    }
  };

  const handleRefreshDocs = async () => {
    setDocUpdateLoading(true);
    setDocUpdateStatus('Scraping latest documentation...');
    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/admin/ingest-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: any = await res.json();
      if (res.ok) {
        const status = `✓ ${data.message}`;
        const timestamp = new Date().toLocaleString();
        setDocUpdateStatus(status);
        setLastUpdated(timestamp);
        setDocsLastUpdated(new Date().toISOString());
        if (data.totalIndexed) setDocsCount(data.totalIndexed);
        localStorage.setItem('rfx-doc-update-status', status);
        localStorage.setItem('rfx-doc-last-updated', timestamp);
      } else {
        const status = `✗ Error: ${data.error}`;
        setDocUpdateStatus(status);
        localStorage.setItem('rfx-doc-update-status', status);
      }
    } catch (err: any) {
      const status = `✗ Error: ${err.message}`;
      setDocUpdateStatus(status);
      localStorage.setItem('rfx-doc-update-status', status);
    } finally {
      setDocUpdateLoading(false);
    }
  };

  const handleCompletedRfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRfpUploading(true);
    setRfpUploadStatus('Processing...');
    try {
      let extractedQA: Array<{question: string, answer: string}> = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // @ts-expect-error - loaded from CDN at runtime
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length >= 2) {
            const question = String(row[0] || '').trim();
            const answer = String(row[1] || '').trim();
            if (question.length > 10 && answer.length > 10) {
              extractedQA.push({ question, answer });
            }
          }
        }
      } else if (file.name.endsWith('.docx')) {
        if (!(window as any).JSZip) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const arrayBuffer = await file.arrayBuffer();
        const zip = await (window as any).JSZip.loadAsync(arrayBuffer);
        const xmlFile = zip.file('word/document.xml');
        if (!xmlFile) throw new Error('Invalid Word document');
        const xmlContent = await xmlFile.async('string');
        const paragraphs = xmlContent.split(/<w:p[^>]*>/);
        const extractedLines: string[] = [];
        for (const paragraph of paragraphs) {
          const textMatches = paragraph.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (textMatches && textMatches.length > 0) {
            const paragraphText = textMatches.map((match: string) => match.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join(' ').trim();
            if (paragraphText.length > 0) extractedLines.push(paragraphText);
          }
        }
        const lines = extractedLines;
        let currentQuestion = '';
        let currentAnswer = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.endsWith('?') || trimmed.toLowerCase().startsWith('q:') || trimmed.toLowerCase().startsWith('question:')) {
            if (currentQuestion && currentAnswer) {
              extractedQA.push({ question: currentQuestion, answer: currentAnswer });
            }
            currentQuestion = trimmed;
            currentAnswer = '';
          } else if (currentQuestion && trimmed.length > 0) {
            currentAnswer += (currentAnswer ? ' ' : '') + trimmed;
          }
        }
        if (currentQuestion && currentAnswer) {
          extractedQA.push({ question: currentQuestion, answer: currentAnswer });
        }
      } else {
        const text = await file.text();
        const lines = text.split('\n');
        let currentQuestion = '';
        let currentAnswer = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.endsWith('?') || trimmed.toLowerCase().startsWith('q:') || trimmed.toLowerCase().startsWith('question:')) {
            if (currentQuestion && currentAnswer) {
              extractedQA.push({ question: currentQuestion, answer: currentAnswer });
            }
            currentQuestion = trimmed;
            currentAnswer = '';
          } else if (currentQuestion && trimmed.length > 0) {
            currentAnswer += (currentAnswer ? ' ' : '') + trimmed;
          }
        }
        if (currentQuestion && currentAnswer) {
          extractedQA.push({ question: currentQuestion, answer: currentAnswer });
        }
      }

      if (extractedQA.length === 0) {
        setRfpUploadStatus('✗ No Q&A pairs found');
        setRfpUploading(false);
        return;
      }

      setRfpUploadStatus(`Uploading ${extractedQA.length} Q&A pairs...`);
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/ingest-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, qaData: extractedQA })
      });
      const data: any = await res.json();
      if (res.ok) {
        setRfpUploadStatus(`✓ Ingested ${extractedQA.length} Q&A pairs`);
      } else {
        setRfpUploadStatus(`✗ Error: ${data.error}${data.details ? ' - ' + data.details : ''}`);
      }
    } catch (err: any) {
      setRfpUploadStatus(`✗ Error: ${err.message}`);
    } finally {
      setRfpUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    setLoading(true);
    setError('');
    setResponse('');
    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, categories: selectedCategories }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate response');
      const cleanResponse = data.response.replace(/\*\*/g, '').replace(/\*/g, '');
      setResponse(cleanResponse);
      setQuestionsAnswered(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
  };

  const handleClear = () => {
    setQuestion('');
    setResponse('');
    setError('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    setFileName(file.name);
    setError('');
    setQaList([]);
    try {
      let text = '';
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // @ts-expect-error - loaded from CDN at runtime
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        setExcelData(jsonData);
        let headerRow: any[] = [];
        let headerRowIndex = 0;
        let maxColumns = 0;
        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.length > maxColumns) {
            const nonEmptyCells = row.filter((cell: any) => cell !== undefined && cell !== null && String(cell).trim() !== '').length;
            if (nonEmptyCells > maxColumns) {
              headerRow = row;
              headerRowIndex = i;
              maxColumns = nonEmptyCells;
            }
          }
        }
        if (headerRow.length === 0 || maxColumns === 0) {
          setError('Excel file appears to be empty');
          setFileUploading(false);
          return;
        }
        const columnNames = headerRow.map((cell: any, idx: number) => {
          const cellValue = String(cell || '').trim();
          return cellValue || `Column ${String.fromCharCode(65 + idx)}`;
        });
        setExcelColumns(columnNames);
        setExcelHeaderRow(headerRowIndex);
        setDataStartRow(headerRowIndex + 1);
        setSelectedColumn(-1);
        setAnswerColumn(-1);
        setShowColumnSelector(true);
        setFileUploading(false);
        return;
      } else if (file.name.endsWith('.docx')) {
        if (!(window as any).JSZip) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const arrayBuffer = await file.arrayBuffer();
        const zip = await (window as any).JSZip.loadAsync(arrayBuffer);
        const xmlFile = zip.file('word/document.xml');
        if (!xmlFile) {
          setError('Invalid Word document');
          setFileUploading(false);
          return;
        }
        const xmlContent = await xmlFile.async('string');
        const paragraphs = xmlContent.split(/<w:p[^>]*>/);
        const extractedLines: string[] = [];
        for (const paragraph of paragraphs) {
          const textMatches = paragraph.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (textMatches && textMatches.length > 0) {
            const paragraphText = textMatches.map((match: string) => match.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join(' ').trim();
            if (paragraphText.length > 0) extractedLines.push(paragraphText);
          }
        }
        if (extractedLines.length === 0) {
          setError('No text found in Word document');
          setFileUploading(false);
          return;
        }
        text = extractedLines.join('\n');
      } else {
        text = await file.text();
      }

      setDocumentText(text);
      const lines = text.split('\n');
      const questionKeywords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'describe', 'explain', 'provide', 'detail', 'list', 'specify', 'identify', 'does', 'do', 'can', 'will', 'are', 'is', 'have', 'has', 'support', 'offer', 'include', 'comply'];
      const questions = lines.map(line => line.trim()).filter(line => {
        if (line.length < 10) return false;
        if (line.endsWith('?')) return true;
        const lowerLine = line.toLowerCase();
        const startsWithNumber = /^\d+[\.\)]\s/.test(line);
        const startsWithKeyword = questionKeywords.some(keyword => lowerLine.startsWith(keyword + ' ') || lowerLine.startsWith(keyword + ':'));
        if (startsWithNumber || startsWithKeyword) return true;
        const containsKeyword = questionKeywords.some(keyword => lowerLine.includes(' ' + keyword + ' '));
        return containsKeyword && line.length > 20;
      });

      if (questions.length === 0) {
        setError(`No questions found. Found ${lines.length} lines.`);
        setFileUploading(false);
        return;
      }

      const newQaList = questions.map(q => ({ question: q, answer: '', status: 'pending' as const }));
      setQaList(newQaList);
      setError('');
      setFileUploading(false);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setFileUploading(false);
    }
  };

  const handleExcelConfirm = () => {
    if (!excelData || selectedColumn < 0) {
      setError('Please select a question column');
      return;
    }
    const qaItems: QuestionAnswer[] = [];
    for (let i = dataStartRow; i < excelData.length; i++) {
      const row = excelData[i];
      if (row && row[selectedColumn] != null) {
        const cellValue = String(row[selectedColumn]).trim();
        if (cellValue.length > 0) {
          qaItems.push({ question: cellValue, answer: '', status: 'pending', rowIndex: i });
        }
      }
    }
    if (qaItems.length === 0) {
      setError('No questions found in the selected column starting from that row');
      return;
    }
    setShowColumnSelector(false);
    setFileUploading(false);
    setQaList(qaItems);
    setError('');
  };

  const handleProcessBulk = async () => {
    if (qaList.length === 0) {
      setError('No questions found');
      return;
    }
    setBatchProcessing(true);
    setError('');
    try {
      for (let i = 0; i < qaList.length; i++) {
        setQaList(prev => prev.map((qa, idx) => idx === i ? { ...qa, status: 'processing' } : qa));
        const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: qaList[i].question, categories: selectedCategories }),
        });
        const data: any = await res.json();
        if (res.ok) {
          const cleanAnswer = data.response.replace(/\*\*/g, '').replace(/\*/g, '');
          setQaList(prev => prev.map((qa, idx) => idx === i ? { ...qa, answer: cleanAnswer, status: 'completed' } : qa));
          setQuestionsAnswered(prev => prev + 1);
        } else {
          setQaList(prev => prev.map((qa, idx) => idx === i ? { ...qa, answer: 'Error generating response', status: 'error' } : qa));
        }
        if (i < qaList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleExport = async () => {
    // If we have excel data and an answer column, export as xlsx
    if (excelData && answerColumn >= 0) {
      try {
        // @ts-expect-error - loaded from CDN at runtime
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        // Clone the original data
        const exportData = excelData.map((row: any[]) => [...(row || [])]);
        // Write answers into the answer column
        for (const qa of qaList) {
          if (qa.rowIndex != null && qa.answer) {
            while (exportData[qa.rowIndex].length <= answerColumn) {
              exportData[qa.rowIndex].push('');
            }
            exportData[qa.rowIndex][answerColumn] = qa.answer;
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'RFx Responses');
        XLSX.writeFile(wb, fileName ? fileName.replace(/\.[^.]+$/, '-answered.xlsx') : 'rfx-responses.xlsx');
      } catch (err: any) {
        setError(`Export error: ${err.message}`);
      }
      return;
    }
    // Fallback: export as text
    let exportText = 'RFx Responses\n\n';
    qaList.forEach((qa, idx) => {
      exportText += `Question ${idx + 1}:\n${qa.question}\n\nAnswer:\n${qa.answer}\n\n---\n\n`;
    });
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfx-responses.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rfx-page">
      {/* Header */}
      <div className="rfx-header">
        <h2 className="rfx-title">RFx Response Generator</h2>
        <p className="rfx-subtitle">Generate professional RFP/RFI responses powered by AI and Cloudflare documentation</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '9999px', fontSize: '12px',
            background: docsLastUpdated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: docsLastUpdated ? '#10B981' : '#F59E0B',
            fontWeight: 600,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: docsLastUpdated ? '#10B981' : '#F59E0B' }} />
            {docsLastUpdated
              ? `Docs updated ${new Date(docsLastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Docs not yet indexed'}
          </span>
          {docsCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '9999px', fontSize: '12px',
              background: 'var(--bg-tertiary, rgba(107,114,128,0.1))',
              color: 'var(--text-secondary, #6B7280)',
              fontWeight: 500,
            }}>
              {docsCount} indexed chunks
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '9999px', fontSize: '12px',
            background: questionsAnswered > 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary, rgba(107,114,128,0.1))',
            color: questionsAnswered > 0 ? '#6366F1' : 'var(--text-secondary, #6B7280)',
            fontWeight: 600,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: questionsAnswered > 0 ? '#6366F1' : 'var(--text-tertiary, #9CA3AF)' }} />
            {questionsAnswered} {questionsAnswered === 1 ? 'question' : 'questions'} answered
          </span>
        </div>
      </div>

      {/* Primary Sections */}
      <div className="rfx-tabs">
        <div className="rfx-tabs-grid">
          <button
            onClick={() => setActiveSection('answer')}
            className={`rfx-btn rfx-btn--seg ${activeSection === 'answer' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            Answer RFx
          </button>
          <button
            onClick={() => setActiveSection('training')}
            className={`rfx-btn rfx-btn--seg ${activeSection === 'training' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            Training & Sources
          </button>
        </div>
      </div>

          {/* Answer RFx */}
          {activeSection === 'answer' && (
            <div className="rfx-layout">
              <div>
                {/* Mode Selector */}
                <div className="rfx-panel">
                  <div className="rfx-row">
                    <div>
                      <h3 className="rfx-h">Answer An RFx</h3>
                      <p className="rfx-muted">Paste a question or upload an RFx file to generate answers.</p>
                    </div>
                    <div className="rfx-fine">Docs + training data</div>
                  </div>
                  <div className="rfx-segment">
                    <button
                      onClick={() => setMode('single')}
                      className={`rfx-btn rfx-btn--seg ${mode === 'single' ? 'rfx-btn--seg-active' : ''}`}
                      type="button"
                    >
                      Single Question
                    </button>
                    <button
                      onClick={() => setMode('bulk')}
                      className={`rfx-btn rfx-btn--seg ${mode === 'bulk' ? 'rfx-btn--seg-active' : ''}`}
                      type="button"
                    >
                      Upload & Answer
                    </button>
                  </div>
                </div>

                {/* Single Question Mode */}
                {mode === 'single' && (
                  <>
                    <div className="rfx-panel">
                      <label className="rfx-fine" style={{ display: 'block', marginBottom: '10px' }}>
                        RFP/RFI Question
                      </label>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Paste your RFP/RFI question here..."
                        disabled={loading}
                      />
                      <div className="rfx-actions">
                        <button
                          onClick={handleGenerate}
                          disabled={loading || !question.trim()}
                          className="rfx-btn rfx-btn--primary"
                          type="button"
                        >
                          {loading ? 'Generating...' : 'Generate Response'}
                        </button>
                        <button
                          onClick={handleClear}
                          disabled={loading}
                          className="rfx-btn"
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                      {error && (
                        <div className="rfx-alert rfx-alert--error">
                          {error}
                        </div>
                      )}
                    </div>

                    {response && (
                      <div className="rfx-panel">
                        <div className="rfx-row" style={{ alignItems: 'center' }}>
                          <h3 className="rfx-h rfx-h-sm">Generated Response</h3>
                          <button
                            onClick={handleCopy}
                            className="rfx-btn"
                            type="button"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="rfx-response">
                          <pre>{response}</pre>
                        </div>
                      </div>
                    )}

                    {loading && (
                      <div className="rfx-panel">
                        <div className="rfx-loading">
                          <div className="rfx-spinner" />
                          <span>Generating response...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Bulk Upload Mode */}
                {mode === 'bulk' && (
                  <>
                    <div className="rfx-panel">
                      <div className="rfx-row" style={{ marginBottom: '12px' }}>
                        <div>
                          <h3 className="rfx-h rfx-h-sm">Upload RFx To Answer</h3>
                          <p className="rfx-muted" style={{ marginTop: '6px' }}>We extract questions and generate answers for each.</p>
                        </div>
                        <button
                          onClick={() => setActiveSection('training')}
                          className="rfx-btn rfx-btn--subtle"
                          type="button"
                        >
                          Need training upload?
                        </button>
                      </div>

                      <label className={`rfx-dropzone ${(batchProcessing || fileUploading) ? 'rfx-dropzone--disabled' : ''}`}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Choose a file</span>
                        <span className="rfx-fine">.txt, .md, .docx, .xlsx, .xls</span>
                        <input
                          type="file"
                          accept=".txt,.md,.doc,.docx,.xlsx,.xls"
                          onChange={handleFileUpload}
                          disabled={batchProcessing || fileUploading}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {fileUploading && (
                        <div className="rfx-alert">
                          Processing {fileName}...
                        </div>
                      )}

                      {showColumnSelector && excelColumns.length > 0 && (
                        <div className="rfx-panel" style={{ marginTop: '16px' }}>
                          <h3 className="rfx-h rfx-h-sm" style={{ marginBottom: '16px' }}>Map Excel Columns</h3>

                          {/* Starting Row */}
                          <div className="rfx-excel-field">
                            <label className="rfx-fine" style={{ display: 'block', marginBottom: '6px' }}>Data starts at row</label>
                            <select
                              value={dataStartRow}
                              onChange={(e) => setDataStartRow(Number(e.target.value))}
                              className="rfx-select"
                            >
                              {excelData && excelData.slice(0, Math.min(20, excelData.length)).map((row, idx) => (
                                <option key={idx} value={idx}>
                                  Row {idx + 1}{idx === excelHeaderRow ? ' (detected header)' : ''}: {row ? row.slice(0, 3).map(c => String(c || '').substring(0, 20)).join(' | ') : '(empty)'}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Question Column */}
                          <div className="rfx-excel-field">
                            <label className="rfx-fine" style={{ display: 'block', marginBottom: '6px' }}>Question column</label>
                            <select
                              value={selectedColumn}
                              onChange={(e) => setSelectedColumn(Number(e.target.value))}
                              className="rfx-select"
                            >
                              <option value={-1}>-- Select column --</option>
                              {excelColumns.map((colName, idx) => (
                                <option key={idx} value={idx}>
                                  {String.fromCharCode(65 + idx)}: {colName}
                                  {excelData && excelData[dataStartRow] && excelData[dataStartRow][idx] != null
                                    ? ` — "${String(excelData[dataStartRow][idx]).substring(0, 40)}"`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Answer Column */}
                          <div className="rfx-excel-field">
                            <label className="rfx-fine" style={{ display: 'block', marginBottom: '6px' }}>Answer column (where answers will be written)</label>
                            <select
                              value={answerColumn}
                              onChange={(e) => setAnswerColumn(Number(e.target.value))}
                              className="rfx-select"
                            >
                              <option value={-1}>-- None (answers shown inline only) --</option>
                              {excelColumns.map((colName, idx) => (
                                <option key={idx} value={idx}>
                                  {String.fromCharCode(65 + idx)}: {colName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Preview */}
                          {excelData && selectedColumn >= 0 && (
                            <div style={{ marginTop: '16px' }}>
                              <div className="rfx-fine" style={{ marginBottom: '8px' }}>
                                Preview — {Math.min(3, Math.max(0, excelData.length - dataStartRow))} of {Math.max(0, excelData.length - dataStartRow)} rows
                              </div>
                              <div className="rfx-excel-preview">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Row</th>
                                      <th>Question ({String.fromCharCode(65 + selectedColumn)})</th>
                                      {answerColumn >= 0 && <th>Answer ({String.fromCharCode(65 + answerColumn)})</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {excelData.slice(dataStartRow, dataStartRow + 3).map((row, idx) => (
                                      <tr key={idx}>
                                        <td>{dataStartRow + idx + 1}</td>
                                        <td>{row && row[selectedColumn] != null ? String(row[selectedColumn]).substring(0, 60) : ''}</td>
                                        {answerColumn >= 0 && (
                                          <td style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            {row && row[answerColumn] != null ? String(row[answerColumn]).substring(0, 40) : '(empty)'}
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="rfx-actions">
                            <button
                              onClick={handleExcelConfirm}
                              disabled={selectedColumn < 0}
                              className="rfx-btn rfx-btn--primary"
                              type="button"
                            >
                              Confirm & Extract Questions
                            </button>
                            <button
                              onClick={() => { setShowColumnSelector(false); setExcelData(null); setExcelColumns([]); setSelectedColumn(-1); setAnswerColumn(-1); }}
                              className="rfx-btn"
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {fileName && !fileUploading && !showColumnSelector && qaList.length > 0 && (
                        <div className="rfx-alert" style={{ borderColor: 'rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.10)', color: '#059669' }}>
                          Extracted {qaList.length} questions from {fileName}
                        </div>
                      )}

                      {qaList.length > 0 && !showColumnSelector && !fileUploading && (
                        <div className="rfx-actions">
                          <button
                            onClick={handleProcessBulk}
                            disabled={batchProcessing}
                            className="rfx-btn rfx-btn--primary"
                            type="button"
                          >
                            {batchProcessing ? `Processing ${qaList.filter(q => q.status === 'completed').length}/${qaList.length}...` : `Process All ${qaList.length} Questions`}
                          </button>
                          <button
                            onClick={handleExport}
                            disabled={batchProcessing || qaList.filter(q => q.status === 'completed').length === 0}
                            className="rfx-btn"
                            type="button"
                          >
                            {excelData && answerColumn >= 0 ? 'Export Excel' : 'Export'}
                          </button>
                        </div>
                      )}

                      {error && (
                        <div className="rfx-alert rfx-alert--error">
                          {error}
                        </div>
                      )}
                    </div>

                    {qaList.length > 0 && (
                      <div>
                        {qaList.map((qa, idx) => (
                          <div key={idx} className="rfx-qa">
                            <div className="rfx-qa-head">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '999px',
                                    background:
                                      qa.status === 'completed' ? '#10b981' :
                                      qa.status === 'processing' ? 'var(--cf-blue)' :
                                      qa.status === 'error' ? '#ef4444' :
                                      'var(--border-color)'
                                  }}
                                />
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Question {idx + 1}</div>
                              </div>
                              <span
                                className={
                                  qa.status === 'completed' ? 'rfx-pill rfx-pill--ok' :
                                  qa.status === 'processing' ? 'rfx-pill rfx-pill--warn' :
                                  qa.status === 'error' ? 'rfx-pill rfx-pill--bad' :
                                  'rfx-pill'
                                }
                              >
                                {qa.status}
                              </span>
                            </div>
                            <p className="rfx-qa-q">{qa.question}</p>
                            {qa.answer && <div className="rfx-qa-a">{qa.answer}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Settings Side Panel */}
              <div>
                <div className="rfx-panel">
                  <div className="rfx-row" style={{ alignItems: 'center' }}>
                    <h3 className="rfx-h rfx-h-sm">Product Categories</h3>
                    <span className="rfx-pill">{selectedCategories.length} selected</span>
                  </div>
                  <p className="rfx-muted">Limit responses to the categories you care about.</p>
                  <div className="rfx-categories">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`rfx-btn ${selectedCategories.includes(category.id) ? 'rfx-btn--primary' : ''}`}
                        type="button"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rfx-panel">
                  <h3 className="rfx-h rfx-h-sm">What This Uses</h3>
                  <div className="rfx-muted">
                    <div style={{ marginTop: '10px' }}>Primary source: indexed Cloudflare documentation.</div>
                    <div style={{ marginTop: '10px' }}>Optional: completed RFP training uploads (managed in Training & Sources).</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Training & Sources */}
          {activeSection === 'training' && (
            <>
              <div className="rfx-panel">
                <h3 className="rfx-h">Training & Sources</h3>
                <p className="rfx-muted">Manage the knowledge sources used when generating answers.</p>
              </div>

              {/* Documentation Database */}
              <div className="rfx-panel">
                <div className="rfx-row">
                  <div style={{ flex: 1 }}>
                    <h3 className="rfx-h rfx-h-sm">Cloudflare Documentation Index</h3>
                    {lastUpdated ? (
                      <p className="rfx-muted" style={{ marginTop: '8px' }}>Last updated: {lastUpdated}</p>
                    ) : (
                      <p className="rfx-muted" style={{ marginTop: '8px' }}>No documentation indexed</p>
                    )}
                    {docUpdateStatus && (
                      <div className="rfx-alert" style={{
                        borderColor: docUpdateStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.25)' :
                          docUpdateStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.25)' :
                          'rgba(0, 81, 195, 0.25)',
                        background: docUpdateStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.10)' :
                          docUpdateStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.10)' :
                          'rgba(0, 81, 195, 0.08)',
                        color: docUpdateStatus.startsWith('✓') ? '#059669' :
                          docUpdateStatus.startsWith('✗') ? '#dc2626' :
                          'var(--text-primary)'
                      }}>
                        {docUpdateStatus}
                      </div>
                    )}
                    {clearDocsStatus && (
                      <div className="rfx-alert" style={{
                        borderColor: clearDocsStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.25)' :
                          clearDocsStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.25)' :
                          'rgba(0, 81, 195, 0.25)',
                        background: clearDocsStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.10)' :
                          clearDocsStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.10)' :
                          'rgba(0, 81, 195, 0.08)',
                        color: clearDocsStatus.startsWith('✓') ? '#059669' :
                          clearDocsStatus.startsWith('✗') ? '#dc2626' :
                          'var(--text-primary)'
                      }}>
                        {clearDocsStatus}
                      </div>
                    )}
                    <p className="rfx-fine" style={{ marginTop: '10px' }}>Scrapes pages from developers.cloudflare.com</p>
                  </div>
                  <div className="rfx-actions" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 0 }}>
                    <button
                      onClick={handleRefreshDocs}
                      disabled={docUpdateLoading || clearingDocs}
                      className="rfx-btn rfx-btn--primary"
                      type="button"
                    >
                      {docUpdateLoading ? 'Refreshing...' : 'Refresh Docs'}
                    </button>
                    <button
                      onClick={handleClearDocs}
                      disabled={clearingDocs || docUpdateLoading}
                      className="rfx-btn rfx-btn--danger"
                      type="button"
                    >
                      {clearingDocs ? 'Clearing...' : 'Clear Database'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Training Data */}
              <div className="rfx-panel">
                <div className="rfx-row" style={{ marginBottom: '12px' }}>
                  <div>
                    <h3 className="rfx-h rfx-h-sm">Upload Completed RFP (Training)</h3>
                    <p className="rfx-muted" style={{ marginTop: '6px' }}>
                      Upload Q&A pairs from a completed RFP so the generator can reuse prior answers.
                      <span className="rfx-fine" style={{ display: 'block', marginTop: '6px' }}>Note: Cloudflare docs are prioritized over uploaded content.</span>
                    </p>
                  </div>
                </div>

                <label className={`rfx-dropzone ${rfpUploading ? 'rfx-dropzone--disabled' : ''}`}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Choose a completed RFP file</span>
                  <span className="rfx-fine">.docx, .xlsx, .txt, .md</span>
                  <input
                    type="file"
                    accept=".txt,.md,.docx,.xlsx,.xls"
                    onChange={handleCompletedRfpUpload}
                    disabled={rfpUploading}
                    style={{ display: 'none' }}
                  />
                </label>

                {rfpUploading && <div className="rfx-alert">Processing...</div>}
                {rfpUploadStatus && (
                  <div className="rfx-alert" style={{
                    borderColor: rfpUploadStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.25)' :
                      rfpUploadStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.25)' :
                      'rgba(0, 81, 195, 0.25)',
                    background: rfpUploadStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.10)' :
                      rfpUploadStatus.startsWith('✗') ? 'rgba(239, 68, 68, 0.10)' :
                      'rgba(0, 81, 195, 0.08)',
                    color: rfpUploadStatus.startsWith('✓') ? '#059669' :
                      rfpUploadStatus.startsWith('✗') ? '#dc2626' :
                      'var(--text-primary)'
                  }}>
                    {rfpUploadStatus}
                  </div>
                )}

                <div className="rfx-row" style={{ marginTop: '12px', alignItems: 'center' }}>
                  <p className="rfx-fine" style={{ margin: 0 }}>Supports: Excel, Word, Text files</p>
                  <button
                    onClick={() => {
                      setShowAdminPanel(!showAdminPanel);
                      if (!showAdminPanel) handleLoadUploadedRfps();
                    }}
                    className="rfx-btn"
                    type="button"
                  >
                    {showAdminPanel ? 'Hide' : 'Manage'} Uploads
                  </button>
                </div>
              </div>

              {/* Manage Uploads Panel */}
              {showAdminPanel && (
                <div className="rfx-panel">
                  <h3 className="rfx-h rfx-h-sm" style={{ marginBottom: '14px' }}>Manage Uploaded RFPs</h3>
                  {loadingRfps ? (
                    <div className="rfx-loading"><div className="rfx-spinner" />Loading...</div>
                  ) : uploadedRfps.length === 0 ? (
                    <p className="rfx-muted" style={{ textAlign: 'center' }}>No uploaded RFPs found</p>
                  ) : (
                    <div>
                      {uploadedRfps.map((rfp, idx) => (
                        <div key={idx} className="rfx-qa" style={{ padding: '16px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{rfp.fileName}</div>
                            <div className="rfx-muted" style={{ marginTop: '6px', fontSize: '14px' }}>
                              {rfp.count} Q&A pairs • {new Date(rfp.uploadedAt).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteRfp(rfp.fileName)}
                            className="rfx-btn rfx-btn--danger"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
    </div>
  );
}
