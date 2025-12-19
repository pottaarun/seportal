import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";

export function meta() {
  return [
    { title: "Assets - SolutionHub" },
    { name: "description", content: "Shared assets and resources" },
  ];
}

export default function Assets() {
  const { isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [assetType, setAssetType] = useState("urls");
  const [showModal, setShowModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('action') === 'upload';
    }
    return false;
  });
  const [showFileModal, setShowFileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [newFile, setNewFile] = useState({
    name: "",
    category: "template",
    description: "",
    targetGroups: ['all'] as string[]
  });
  const [sortBy, setSortBy] = useState("date");
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [imagePreview, setImagePreview] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedUrlAssets, setSelectedUrlAssets] = useState<Set<string>>(new Set());
  const [selectedFileAssets, setSelectedFileAssets] = useState<Set<string>>(new Set());
  const [newUrl, setNewUrl] = useState({
    title: "",
    url: "",
    description: "",
    category: "resource",
    tags: "",
    owner: "",
    imageUrl: "",
    productId: "",
    targetGroups: ['all'] as string[]
  });

  const defaultFileAssets = [
    { id: '1', name: 'Customer Demo Template', type: 'presentation', category: 'template', size: '2.4 MB', downloads: 47, date: '2 days ago', icon: '📊' },
    { id: '2', name: 'Architecture Diagram Kit', type: 'design', category: 'design', size: '1.8 MB', downloads: 35, date: '1 week ago', icon: '🏗️' },
    { id: '3', name: 'ROI Calculator Spreadsheet', type: 'spreadsheet', category: 'tool', size: '524 KB', downloads: 62, date: '3 days ago', icon: '📈' },
    { id: '4', name: 'Security Best Practices Guide', type: 'document', category: 'guide', size: '1.2 MB', downloads: 89, date: '1 day ago', icon: '🔒' },
    { id: '5', name: 'Product Comparison Sheet', type: 'spreadsheet', category: 'template', size: '856 KB', downloads: 41, date: '5 days ago', icon: '📋' },
    { id: '6', name: 'Onboarding Checklist', type: 'document', category: 'guide', size: '432 KB', downloads: 73, date: '2 weeks ago', icon: '✅' },
  ];

  const [fileAssets, setFileAssets] = useState<any[]>([]);

  useEffect(() => {
    const loadFileAssets = async () => {
      try {
        const data = await api.fileAssets.getAll();
        setFileAssets(data);
      } catch (e) {
        console.error('Error loading file assets:', e);
      }
    };
    const loadProducts = async () => {
      try {
        const data = await api.products.getAll();
        setProducts(data);
      } catch (e) {
        console.error('Error loading products:', e);
      }
    };
    loadFileAssets();
    loadProducts();
  }, []);

  const deleteFileAsset = async (fileId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (confirmed) {
      try {
        await api.fileAssets.delete(fileId);
        setFileAssets(prev => prev.filter(file => file.id !== fileId));
        alert('File deleted successfully!');
      } catch (e) {
        console.error('Error deleting file:', e);
        alert('Failed to delete file');
      }
    }
  };

  const bulkDeleteFileAssets = async () => {
    const selectedIds = Array.from(selectedFileAssets);
    if (selectedIds.length === 0) {
      alert('No files selected');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''}?`);
    if (confirmed) {
      try {
        await api.fileAssets.bulkDelete(selectedIds);
        setFileAssets(prev => prev.filter(file => !selectedIds.includes(file.id)));
        setSelectedFileAssets(new Set());
        alert(`${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''} deleted successfully!`);
      } catch (e) {
        console.error('Error deleting files:', e);
        alert('Failed to delete files');
      }
    }
  };

  const toggleFileAssetSelection = (id: string) => {
    setSelectedFileAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllFileAssets = () => {
    if (selectedFileAssets.size === filteredFileAssets.length) {
      setSelectedFileAssets(new Set());
    } else {
      setSelectedFileAssets(new Set(filteredFileAssets.map(asset => asset.id)));
    }
  };

  const handleDownloadFile = async (fileAsset: any) => {
    try {
      // Check if file has a file_key (actual file in storage)
      if (!fileAsset.file_key) {
        alert('This file has not been uploaded yet. Please use "Upload File" to add files with actual content.');
        return;
      }

      const response = await api.fileAssets.download(fileAsset.id);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get the filename from the response header or use the asset name
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileAsset.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reload file assets to get updated download count
      const data = await api.fileAssets.getAll();
      setFileAssets(data);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditFile = (file: any) => {
    setEditingFile(file);
    setNewFile({
      name: file.name,
      category: file.category,
      description: file.description || ''
    });
    setShowEditFileModal(true);
  };

  const saveEditFile = async () => {
    if (!editingFile) return;

    try {
      await api.fileAssets.update(editingFile.id, {
        name: newFile.name,
        category: newFile.category,
        description: newFile.description
      });

      const updatedFile = {
        ...editingFile,
        name: newFile.name,
        category: newFile.category,
        description: newFile.description
      };

      setFileAssets(prev => prev.map(file =>
        file.id === editingFile.id ? updatedFile : file
      ));

      setShowEditFileModal(false);
      setEditingFile(null);
      setNewFile({ name: "", category: "template", description: "", targetGroups: ['all'] });
      alert('File updated successfully!');
    } catch (e) {
      console.error('Error updating file:', e);
      alert('Failed to update file');
    }
  };

  // Initial default assets
  const defaultUrlAssets = [
    {
      id: '1',
      title: 'Cloudflare Workers Documentation',
      url: 'https://developers.cloudflare.com/workers/',
      category: 'documentation',
      description: 'Comprehensive guide to building serverless applications with Cloudflare Workers. Covers fundamentals, API reference, and best practices.',
      owner: 'Mike Chen',
      likes: 24,
      dateAdded: new Date('2025-10-29'),
      icon: '📚',
      imageUrl: 'https://www.cloudflare.com/favicon.ico',
      tags: ['workers', 'serverless', 'documentation']
    },
    {
      id: '2',
      title: 'D1 Database Best Practices',
      url: 'https://developers.cloudflare.com/d1/',
      category: 'resource',
      description: 'Essential patterns and optimization techniques for Cloudflare D1. Includes query optimization, indexing strategies, and connection pooling tips.',
      owner: 'Sarah Park',
      likes: 42,
      dateAdded: new Date('2025-10-27'),
      icon: '🗄️',
      imageUrl: '',
      tags: ['d1', 'database', 'optimization']
    },
    {
      id: '3',
      title: 'Security Configuration Checklist',
      url: 'https://example.com/security-checklist',
      category: 'guide',
      description: 'Step-by-step security hardening guide for production deployments. Covers WAF rules, DDoS protection, and API security best practices.',
      owner: 'Alex Kumar',
      likes: 18,
      dateAdded: new Date('2025-10-25'),
      icon: '🔒',
      imageUrl: '',
      tags: ['security', 'waf', 'best-practices']
    },
    {
      id: '4',
      title: 'API Integration Examples',
      url: 'https://github.com/cloudflare/api-examples',
      category: 'code',
      description: 'Collection of production-ready code examples demonstrating Cloudflare API integration patterns across multiple languages and frameworks.',
      owner: 'Jordan Lee',
      likes: 35,
      dateAdded: new Date('2025-10-23'),
      icon: '💻',
      imageUrl: '',
      tags: ['api', 'examples', 'integration']
    },
    {
      id: '5',
      title: 'Performance Optimization Guide',
      url: 'https://blog.cloudflare.com/performance',
      category: 'article',
      description: 'Deep dive into performance optimization techniques for Cloudflare services. Real-world case studies and benchmarking methodologies included.',
      owner: 'Emily Rodriguez',
      likes: 51,
      dateAdded: new Date('2025-10-16'),
      icon: '⚡',
      imageUrl: '',
      tags: ['performance', 'optimization', 'caching']
    },
  ];

  const [urlAssets, setUrlAssets] = useState<any[]>([]);

  // Load from API on mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const userEmail = localStorage.getItem('seportal_user') || 'anonymous';

        // Load assets
        const data = await api.urlAssets.getAll();
        const assets = data.map((asset: any) => ({
          ...asset,
          dateAdded: new Date(asset.date_added),
          imageUrl: asset.image_url,
          tags: typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags
        }));
        setUrlAssets(assets);

        // Load user's likes from database
        const likedIds = await api.urlAssets.getUserLikes(userEmail);
        setLikedAssets(new Set(likedIds));
      } catch (e) {
        console.error('Error loading assets:', e);
      }
    };
    loadAssets();
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      documentation: '📚',
      resource: '📦',
      guide: '📖',
      code: '💻',
      article: '📄',
      template: '📋',
      design: '🎨',
      tool: '🛠️'
    };
    return icons[category] || '🔗';
  };

  const canEditAsset = (asset: any) => {
    if (isAdmin) return true;
    const currentUserEmail = localStorage.getItem('seportal_user');
    const currentUserName = localStorage.getItem('seportal_user_name');
    return asset.owner === currentUserEmail || asset.owner === currentUserName;
  };

  const handleEditAsset = (asset: any) => {
    setEditingAsset(asset);
    setNewUrl({
      title: asset.title,
      url: asset.url,
      description: asset.description,
      category: asset.category,
      tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : asset.tags || '',
      owner: asset.owner,
      imageUrl: asset.imageUrl || '',
      productId: asset.product_id || asset.productId || '',
      targetGroups: asset.targetGroups || ['all']
    });
    setImagePreview(asset.imageUrl || '');
    setShowEditModal(true);
  };

  const saveEditAsset = async () => {
    if (!editingAsset) return;

    try {
      const tags = newUrl.tags.split(',').map(t => t.trim()).filter(t => t);
      await api.urlAssets.update(editingAsset.id, {
        title: newUrl.title,
        url: newUrl.url,
        description: newUrl.description,
        category: newUrl.category,
        tags,
        owner: newUrl.owner,
        imageUrl: newUrl.imageUrl,
        productId: newUrl.productId || null,
        icon: getCategoryIcon(newUrl.category)
      });

      const updatedAsset = {
        ...editingAsset,
        title: newUrl.title,
        url: newUrl.url,
        description: newUrl.description,
        category: newUrl.category,
        tags,
        owner: newUrl.owner,
        imageUrl: newUrl.imageUrl,
        product_id: newUrl.productId || null,
        productId: newUrl.productId || null,
        icon: getCategoryIcon(newUrl.category)
      };

      setUrlAssets(prev => prev.map(asset =>
        asset.id === editingAsset.id ? updatedAsset : asset
      ));

      setShowEditModal(false);
      setEditingAsset(null);
      setImagePreview('');
      setNewUrl({ title: "", url: "", description: "", category: "resource", tags: "", owner: "", imageUrl: "", productId: "", targetGroups: ['all'] });
      alert('Asset updated successfully!');
    } catch (e) {
      console.error('Error updating asset:', e);
      alert('Failed to update asset');
    }
  };

  const deleteAsset = async (assetId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this asset?');
    if (confirmed) {
      try {
        await api.urlAssets.delete(assetId);
        setUrlAssets(prev => prev.filter(asset => asset.id !== assetId));
        alert('Asset deleted successfully!');
      } catch (e) {
        console.error('Error deleting asset:', e);
        alert('Failed to delete asset');
      }
    }
  };

  const bulkDeleteUrlAssets = async () => {
    const selectedIds = Array.from(selectedUrlAssets);
    if (selectedIds.length === 0) {
      alert('No URL assets selected');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} URL asset${selectedIds.length > 1 ? 's' : ''}?`);
    if (confirmed) {
      try {
        await api.urlAssets.bulkDelete(selectedIds);
        setUrlAssets(prev => prev.filter(asset => !selectedIds.includes(asset.id)));
        setSelectedUrlAssets(new Set());
        alert(`${selectedIds.length} URL asset${selectedIds.length > 1 ? 's' : ''} deleted successfully!`);
      } catch (e) {
        console.error('Error deleting URL assets:', e);
        alert('Failed to delete URL assets');
      }
    }
  };

  const toggleUrlAssetSelection = (id: string) => {
    setSelectedUrlAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllUrlAssets = () => {
    if (selectedUrlAssets.size === filteredAndSortedUrlAssets.length) {
      setSelectedUrlAssets(new Set());
    } else {
      setSelectedUrlAssets(new Set(filteredAndSortedUrlAssets.map(asset => asset.id)));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setNewUrl({ ...newUrl, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleLike = async (assetId: string) => {
    const userEmail = localStorage.getItem('seportal_user') || 'anonymous';

    try {
      await api.urlAssets.like(assetId, userEmail);

      // Reload assets and likes from database
      const data = await api.urlAssets.getAll();
      const assets = data.map((asset: any) => ({
        ...asset,
        dateAdded: new Date(asset.date_added),
        imageUrl: asset.image_url,
        tags: typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags
      }));
      setUrlAssets(assets);

      // Reload user's likes from database
      const likedIds = await api.urlAssets.getUserLikes(userEmail);
      setLikedAssets(new Set(likedIds));
    } catch (error) {
      console.error('Failed to like asset:', error);
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const filteredAndSortedUrlAssets = urlAssets
    .filter((link) => {
      const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           link.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filter === "all" || link.category === filter;
      const matchesProduct = productFilter === "all" ||
                            (productFilter === "none" && !link.productId && !link.product_id) ||
                            link.productId === productFilter ||
                            link.product_id === productFilter;
      return matchesSearch && matchesFilter && matchesProduct;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b.likes - a.likes;
        case 'uses':
          return (b.uses || 0) - (a.uses || 0);
        case 'date':
          return b.dateAdded.getTime() - a.dateAdded.getTime();
        case 'owner':
          return a.owner.localeCompare(b.owner);
        default:
          return 0;
      }
    });

  const filteredFileAssets = fileAssets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || asset.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📁 Shared Assets</h2>
          <p>Files, URLs, and resources for the team</p>
          {isAdmin && (
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>
              ✓ Admin Mode Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowFileModal(true)}>
            📄 Upload File
          </button>
          <button onClick={() => setShowModal(true)}>
            🔗 Add URL
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          className={`filter-btn ${assetType === "files" ? "active" : ""}`}
          onClick={() => {
            setAssetType("files");
            setFilter("all");
          }}
          style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
        >
          📄 Files
        </button>
        <button
          className={`filter-btn ${assetType === "urls" ? "active" : ""}`}
          onClick={() => {
            setAssetType("urls");
            setFilter("all");
          }}
          style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
        >
          🔗 URLs & Links
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: '1', minWidth: '300px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={assetType === "files" ? "Search files..." : "Search links, tags..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {assetType === "urls" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
              style={{ padding: '8px 12px', fontSize: '12px', minWidth: '140px' }}
            >
              <option value="date">Date Added</option>
              <option value="likes">Most Liked</option>
              <option value="uses">Most Used</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        )}
      </div>

      {assetType === "files" && (
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All Files
          </button>
          <button className={`filter-btn ${filter === "template" ? "active" : ""}`} onClick={() => setFilter("template")}>
            Templates
          </button>
          <button className={`filter-btn ${filter === "guide" ? "active" : ""}`} onClick={() => setFilter("guide")}>
            Guides
          </button>
          <button className={`filter-btn ${filter === "design" ? "active" : ""}`} onClick={() => setFilter("design")}>
            Design Files
          </button>
          <button className={`filter-btn ${filter === "tool" ? "active" : ""}`} onClick={() => setFilter("tool")}>
            Tools
          </button>
        </div>
      )}

      {assetType === "urls" && (
        <>
          <div className="filter-buttons">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All Links
            </button>
            <button className={`filter-btn ${filter === "documentation" ? "active" : ""}`} onClick={() => setFilter("documentation")}>
              Documentation
            </button>
            <button className={`filter-btn ${filter === "resource" ? "active" : ""}`} onClick={() => setFilter("resource")}>
              Resources
            </button>
            <button className={`filter-btn ${filter === "guide" ? "active" : ""}`} onClick={() => setFilter("guide")}>
              Guides
            </button>
            <button className={`filter-btn ${filter === "code" ? "active" : ""}`} onClick={() => setFilter("code")}>
              Code
            </button>
            <button className={`filter-btn ${filter === "article" ? "active" : ""}`} onClick={() => setFilter("article")}>
              Articles
            </button>
          </div>

          {/* Product Filter */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Filter by Product
            </div>
            <div className="filter-buttons">
              <button className={`filter-btn ${productFilter === "all" ? "active" : ""}`} onClick={() => setProductFilter("all")}>
                All Products
              </button>
              <button className={`filter-btn ${productFilter === "none" ? "active" : ""}`} onClick={() => setProductFilter("none")}>
                No Product
              </button>
              {products.map((product: any) => (
                <button
                  key={product.id}
                  className={`filter-btn ${productFilter === product.id ? "active" : ""}`}
                  onClick={() => setProductFilter(product.id)}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {assetType === "files" && (
        <>
          {isAdmin && filteredFileAssets.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedFileAssets.size === filteredFileAssets.length && filteredFileAssets.length > 0}
                  onChange={toggleAllFileAssets}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500' }}>
                  Select All ({filteredFileAssets.length})
                </span>
              </label>
              {selectedFileAssets.size > 0 && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {selectedFileAssets.size} selected
                  </span>
                  <button
                    onClick={bulkDeleteFileAssets}
                    className="btn-danger"
                    style={{ marginLeft: 'auto' }}
                  >
                    Delete Selected ({selectedFileAssets.size})
                  </button>
                </>
              )}
            </div>
          )}
          <div className="customers-list">
          {filteredFileAssets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No files uploaded yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Upload files to share templates, guides, and tools with your team
              </p>
              <button onClick={() => setShowFileModal(true)}>Upload Your First File</button>
            </div>
          ) : (
            filteredFileAssets.map((asset, index) => (
            <div
              key={asset.id}
              className="customer-card animate-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={selectedFileAssets.has(asset.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileAssetSelection(asset.id);
                    }}
                    style={{ width: '20px', height: '20px', marginTop: '0.5rem', cursor: 'pointer' }}
                  />
                )}
                <div style={{
                  fontSize: '2.5rem',
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, var(--cf-orange-light), var(--cf-orange))',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  boxShadow: '0 4px 12px rgba(246, 130, 31, 0.2)'
                }}>
                  {asset.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>{asset.name}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <span>📦 {asset.size}</span>
                    <span>⬇️ {asset.downloads} downloads</span>
                    <span>🕐 {asset.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleDownloadFile(asset)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Download ({asset.downloads || 0})
                    </button>
                    <button style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
                      Share
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditFile(asset);
                          }}
                          type="button"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.875rem',
                            background: 'var(--cf-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '980px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteFileAsset(asset.id);
                          }}
                          type="button"
                          className="btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
        </>
      )}

      {assetType === "urls" && (
        <>
          {isAdmin && filteredAndSortedUrlAssets.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedUrlAssets.size === filteredAndSortedUrlAssets.length && filteredAndSortedUrlAssets.length > 0}
                  onChange={toggleAllUrlAssets}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500' }}>
                  Select All ({filteredAndSortedUrlAssets.length})
                </span>
              </label>
              {selectedUrlAssets.size > 0 && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {selectedUrlAssets.size} selected
                  </span>
                  <button
                    onClick={bulkDeleteUrlAssets}
                    className="btn-danger"
                    style={{ marginLeft: 'auto' }}
                  >
                    Delete Selected ({selectedUrlAssets.size})
                  </button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {filteredAndSortedUrlAssets.map((link, index) => (
            <div
              key={link.id}
              className="card animate-in"
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={selectedUrlAssets.has(link.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleUrlAssetSelection(link.id);
                    }}
                    style={{ width: '20px', height: '20px', marginTop: '0.5rem', cursor: 'pointer' }}
                  />
                )}
                {link.imageUrl ? (
                  <img
                    src={link.imageUrl}
                    alt={link.title}
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      background: 'var(--bg-tertiary)'
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: '32px',
                    lineHeight: 1,
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '56px',
                    minHeight: '56px'
                  }}>
                    {link.icon}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '19px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                        {link.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--cf-blue)',
                            fontSize: '13px',
                            textDecoration: 'none',
                            fontWeight: '400'
                          }}
                        >
                          {link.url.replace('https://', '').replace('http://', '')} →
                        </a>
                        {(link.product_id || link.productId) && (() => {
                          const product = products.find(p => p.id === (link.product_id || link.productId));
                          return product ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              background: 'linear-gradient(135deg, var(--cf-orange), #ff8c42)',
                              color: 'white',
                              borderRadius: '4px',
                              letterSpacing: '0.02em'
                            }}>
                              {product.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {link.tags && link.tags.length > 0 && (
                    <div className="tags-container">
                      {link.tags.map((tag, idx) => (
                        <span key={idx} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p style={{
                    margin: '12px 0',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.47059,
                    fontSize: '15px',
                    letterSpacing: '-0.022em'
                  }}>
                    {link.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {link.owner}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {getRelativeTime(link.dateAdded)}
                      </span>
                      <button
                        className={`heart-btn ${likedAssets.has(link.id) ? 'liked' : ''}`}
                        onClick={() => toggleLike(link.id)}
                      >
                        <span className="heart-icon">{likedAssets.has(link.id) ? '♥' : '♡'}</span>
                        <span>{link.likes}</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={async () => {
                          await api.urlAssets.incrementUses(link.id);
                          window.open(link.url, '_blank');
                        }}
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Visit ({link.uses || 0} uses)
                      </button>
                      {canEditAsset(link) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditAsset(link);
                          }}
                          type="button"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            background: 'var(--cf-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '980px',
                            cursor: 'pointer',
                            fontWeight: '400',
                            letterSpacing: '-0.01em',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteAsset(link.id);
                          }}
                          type="button"
                          className="btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Upload File Asset</h3>
              <button className="modal-close" onClick={() => setShowFileModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              const fileInput = document.getElementById('file') as HTMLInputElement;
              const file = fileInput.files?.[0];

              if (!file) {
                alert('Please select a file');
                return;
              }

              try {
                const fileId = Date.now().toString();
                const metadata = {
                  id: fileId,
                  name: newFile.name,
                  category: newFile.category,
                  size: `${(file.size / 1024).toFixed(0)} KB`,
                  date: new Date().toISOString(),
                  icon: getCategoryIcon(newFile.category),
                  description: newFile.description,
                  targetGroups: newFile.targetGroups
                };

                await api.fileAssets.upload(file, metadata);

                // Reload file assets
                const data = await api.fileAssets.getAll();
                setFileAssets(data);

                setShowFileModal(false);
                setNewFile({ name: "", category: "template", description: "", targetGroups: ['all'] });
                alert('File uploaded successfully!');
              } catch (error) {
                console.error('Error uploading file:', error);
                alert('Failed to upload file');
              }
            }}>
              <div className="form-group">
                <label htmlFor="file">File *</label>
                <input
                  id="file"
                  type="file"
                  className="form-input"
                  required
                  style={{ padding: '8px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="file-name">Name *</label>
                <input
                  id="file-name"
                  type="text"
                  className="form-input"
                  value={newFile.name}
                  onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                  placeholder="e.g., Customer Demo Template"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="file-category">Category</label>
                <select
                  id="file-category"
                  className="form-select"
                  value={newFile.category}
                  onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}
                >
                  <option value="template">Template</option>
                  <option value="guide">Guide</option>
                  <option value="design">Design</option>
                  <option value="tool">Tool</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="file-description">Description</label>
                <textarea
                  id="file-description"
                  className="form-input"
                  value={newFile.description}
                  onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                  placeholder="Brief description of what this file contains..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <GroupSelector
                selectedGroups={newFile.targetGroups}
                onChange={(groups) => setNewFile({ ...newFile, targetGroups: groups })}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFileModal(false)}>
                  Cancel
                </button>
                <button type="submit">Upload File</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Share a URL</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              // Create new URL asset
              const newAsset = {
                id: Date.now().toString(),
                title: newUrl.title,
                url: newUrl.url,
                category: newUrl.category,
                description: newUrl.description,
                owner: newUrl.owner,
                likes: 0,
                dateAdded: new Date().toISOString(),
                icon: getCategoryIcon(newUrl.category),
                imageUrl: newUrl.imageUrl,
                tags: newUrl.tags.split(',').map(t => t.trim()).filter(t => t),
                productId: newUrl.productId || null,
                targetGroups: newUrl.targetGroups
              };

              try {
                // Add to API
                await api.urlAssets.create(newAsset);

                // Add to local state
                setUrlAssets(prev => [{...newAsset, dateAdded: new Date()}, ...prev]);

                // Close modal and reset form
                setShowModal(false);
                setImagePreview("");
                setNewUrl({ title: "", url: "", description: "", category: "resource", tags: "", owner: "", imageUrl: "", productId: "", targetGroups: ['all'] });

                alert('URL added successfully!');
              } catch (error) {
                console.error('Error adding URL:', error);
                alert('Failed to add URL');
              }
            }}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={newUrl.title}
                  onChange={(e) => setNewUrl({ ...newUrl, title: e.target.value })}
                  placeholder="e.g., Cloudflare Workers Guide"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="url">URL *</label>
                <input
                  id="url"
                  type="url"
                  className="form-input"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="owner">Your Name *</label>
                <input
                  id="owner"
                  type="text"
                  className="form-input"
                  value={newUrl.owner}
                  onChange={(e) => setNewUrl({ ...newUrl, owner: e.target.value })}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="form-select"
                  value={newUrl.category}
                  onChange={(e) => setNewUrl({ ...newUrl, category: e.target.value })}
                >
                  <option value="documentation">Documentation</option>
                  <option value="resource">Resource</option>
                  <option value="guide">Guide</option>
                  <option value="code">Code</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="product">Product (optional)</label>
                <select
                  id="product"
                  className="form-select"
                  value={newUrl.productId}
                  onChange={(e) => setNewUrl({ ...newUrl, productId: e.target.value })}
                >
                  <option value="">-- No specific product --</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  id="tags"
                  type="text"
                  className="form-input"
                  value={newUrl.tags}
                  onChange={(e) => setNewUrl({ ...newUrl, tags: e.target.value })}
                  placeholder="e.g., workers, serverless, api"
                />
              </div>

              <div className="form-group">
                <label htmlFor="image">Logo / Image (optional)</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleImageUpload}
                  style={{ padding: '8px' }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginTop: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description / Write-up *</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={newUrl.description}
                  onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                  placeholder="Share context about this resource, why it's useful, key takeaways..."
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <GroupSelector
                selectedGroups={newUrl.targetGroups}
                onChange={(groups) => setNewUrl({ ...newUrl, targetGroups: groups })}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Share URL</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Asset</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              saveEditAsset();
            }}>
              <div className="form-group">
                <label htmlFor="edit-title">Title *</label>
                <input
                  id="edit-title"
                  type="text"
                  className="form-input"
                  value={newUrl.title}
                  onChange={(e) => setNewUrl({ ...newUrl, title: e.target.value })}
                  placeholder="e.g., Cloudflare Workers Guide"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-url">URL *</label>
                <input
                  id="edit-url"
                  type="url"
                  className="form-input"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-owner">Owner *</label>
                <input
                  id="edit-owner"
                  type="text"
                  className="form-input"
                  value={newUrl.owner}
                  onChange={(e) => setNewUrl({ ...newUrl, owner: e.target.value })}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-category">Category</label>
                <select
                  id="edit-category"
                  className="form-select"
                  value={newUrl.category}
                  onChange={(e) => setNewUrl({ ...newUrl, category: e.target.value })}
                >
                  <option value="documentation">Documentation</option>
                  <option value="resource">Resource</option>
                  <option value="guide">Guide</option>
                  <option value="code">Code</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-product">Product (optional)</label>
                <select
                  id="edit-product"
                  className="form-select"
                  value={newUrl.productId}
                  onChange={(e) => setNewUrl({ ...newUrl, productId: e.target.value })}
                >
                  <option value="">-- No specific product --</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-tags">Tags (comma-separated)</label>
                <input
                  id="edit-tags"
                  type="text"
                  className="form-input"
                  value={newUrl.tags}
                  onChange={(e) => setNewUrl({ ...newUrl, tags: e.target.value })}
                  placeholder="e.g., workers, serverless, api"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-image">Logo / Image (optional)</label>
                <input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleImageUpload}
                  style={{ padding: '8px' }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginTop: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description / Write-up *</label>
                <textarea
                  id="edit-description"
                  className="form-input"
                  value={newUrl.description}
                  onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                  placeholder="Share context about this resource, why it's useful, key takeaways..."
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditFileModal && (
        <div className="modal-overlay" onClick={() => setShowEditFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit File</h3>
              <button className="modal-close" onClick={() => setShowEditFileModal(false)}>×</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              saveEditFile();
            }}>
              <div className="form-group">
                <label htmlFor="fileName">File Name *</label>
                <input
                  id="fileName"
                  type="text"
                  className="form-input"
                  value={newFile.name}
                  onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                  placeholder="e.g., Customer Demo Template"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fileCategory">Category</label>
                <select
                  id="fileCategory"
                  className="form-select"
                  value={newFile.category}
                  onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}
                >
                  <option value="template">Template</option>
                  <option value="design">Design</option>
                  <option value="tool">Tool</option>
                  <option value="guide">Guide</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fileDescription">Description (optional)</label>
                <textarea
                  id="fileDescription"
                  className="form-input"
                  value={newFile.description}
                  onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                  placeholder="Add details about this file..."
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditFileModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
