import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";

export function meta() {
  return [
    { title: "Assets - SolutionHub" },
    { name: "description", content: "Files, links, URLs, and code scripts for the team" },
  ];
}

type AssetKind = "file" | "link" | "script";

// Category sets per asset kind. When "All" is the active type filter we hide the
// category row (categories differ across kinds); pick a type to refine further.
const URL_CATEGORIES = [
  { id: "documentation", label: "Documentation" },
  { id: "resource", label: "Resources" },
  { id: "guide", label: "Guides" },
  { id: "code", label: "Code" },
  { id: "article", label: "Articles" },
];
const FILE_CATEGORIES = [
  { id: "template", label: "Templates" },
  { id: "guide", label: "Guides" },
  { id: "design", label: "Design Files" },
  { id: "tool", label: "Tools" },
];
const SCRIPT_CATEGORIES = [
  { id: "api", label: "API" },
  { id: "automation", label: "Automation" },
  { id: "database", label: "Database" },
  { id: "security", label: "Security" },
  { id: "utility", label: "Utility" },
];

const TYPE_FILTERS: Array<{ id: "all" | "files" | "links" | "scripts"; label: string; icon: string }> = [
  { id: "all", label: "All", icon: "🗂️" },
  { id: "files", label: "Files", icon: "📄" },
  { id: "links", label: "Links & URLs", icon: "🔗" },
  { id: "scripts", label: "Scripts", icon: "💻" },
];

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    documentation: "📚",
    resource: "📦",
    guide: "📖",
    code: "💻",
    article: "📄",
    template: "📋",
    design: "🎨",
    tool: "🛠️",
  };
  return icons[category] || "🔗";
}

function getScriptIcon(category: string) {
  const icons: Record<string, string> = {
    api: "🔑",
    automation: "🚀",
    database: "🗄️",
    security: "🛡️",
    utility: "🔧",
  };
  return icons[category] || "💻";
}

function TypeBadge({ kind }: { kind: AssetKind }) {
  const map = {
    file: { label: "File", bg: "rgba(246,130,31,0.12)", color: "#F6821F", icon: "📄" },
    link: { label: "Link", bg: "rgba(0,81,195,0.12)", color: "#0051C3", icon: "🔗" },
    script: { label: "Script", bg: "rgba(139,92,246,0.14)", color: "#8B5CF6", icon: "💻" },
  } as const;
  const s = map[kind];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "980px",
        background: s.bg,
        color: s.color,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

export default function Assets() {
  const { isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "files" | "links" | "scripts">("all");
  const [filter, setFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Modals
  const [showModal, setShowModal] = useState(false); // Add URL
  const [showFileModal, setShowFileModal] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("action") === "upload";
    }
    return false;
  });
  const [showScriptModal, setShowScriptModal] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("action") === "share";
    }
    return false;
  });
  const [showEditModal, setShowEditModal] = useState(false); // URL edit
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [editingFile, setEditingFile] = useState<any>(null);

  // Form state
  const [newFile, setNewFile] = useState({
    name: "",
    category: "template",
    description: "",
    targetGroups: ["all"] as string[],
  });
  const [newUrl, setNewUrl] = useState({
    title: "",
    url: "",
    description: "",
    category: "resource",
    tags: "",
    owner: "",
    imageUrl: "",
    productId: "",
    targetGroups: ["all"] as string[],
  });
  const [newScript, setNewScript] = useState({
    name: "",
    language: "javascript",
    category: "api",
    description: "",
    author: "",
    code: "",
    productId: "",
    targetGroups: ["all"] as string[],
  });

  // Data
  const [fileAssets, setFileAssets] = useState<any[]>([]);
  const [urlAssets, setUrlAssets] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Likes
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [likedScripts, setLikedScripts] = useState<Set<string>>(new Set());

  // Selection (bulk)
  const [selectedUrlAssets, setSelectedUrlAssets] = useState<Set<string>>(new Set());
  const [selectedFileAssets, setSelectedFileAssets] = useState<Set<string>>(new Set());
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(new Set());

  // Misc
  const [imagePreview, setImagePreview] = useState<string>("");
  const [fileUploadPct, setFileUploadPct] = useState(0);
  const [fileUploadStatus, setFileUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [fileUploadError, setFileUploadError] = useState<string>("");

  // ---- Load everything ----
  useEffect(() => {
    const userEmail = localStorage.getItem("seportal_user") || "anonymous";
    (async () => {
      try {
        const [files, urls, scr, prods] = await Promise.all([
          api.fileAssets.getAll(),
          api.urlAssets.getAll(),
          api.scripts.getAll(),
          api.products.getAll(),
        ]);
        setFileAssets(Array.isArray(files) ? files : []);
        setUrlAssets(
          (Array.isArray(urls) ? urls : []).map((asset: any) => ({
            ...asset,
            dateAdded: new Date(asset.date_added),
            imageUrl: asset.image_url,
            tags: typeof asset.tags === "string" ? JSON.parse(asset.tags || "[]") : asset.tags || [],
          }))
        );
        setScripts(Array.isArray(scr) ? scr : []);
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (e) {
        console.error("Error loading assets:", e);
      }
      try {
        const [urlLikes, scriptLikes] = await Promise.all([
          api.urlAssets.getUserLikes(userEmail),
          api.scripts.getUserLikes(userEmail),
        ]);
        setLikedAssets(new Set(urlLikes));
        setLikedScripts(new Set(scriptLikes));
      } catch (e) {
        console.error("Error loading likes:", e);
      }
    })();
  }, []);

  // ---- File handlers ----
  const deleteFileAsset = async (fileId: string) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.fileAssets.delete(fileId);
      setFileAssets((prev) => prev.filter((file) => file.id !== fileId));
    } catch (e) {
      console.error("Error deleting file:", e);
      alert("Failed to delete file");
    }
  };

  const toggleFileAssetSelection = (id: string) => {
    setSelectedFileAssets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDownloadFile = async (fileAsset: any) => {
    try {
      if (!fileAsset.file_key) {
        alert('This file has not been uploaded yet. Please use "Upload File" to add files with actual content.');
        return;
      }
      const response = await api.fileAssets.download(fileAsset.id);
      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Download failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileAsset.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      const data = await api.fileAssets.getAll();
      setFileAssets(data);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(`Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleEditFile = (file: any) => {
    setEditingFile(file);
    setNewFile({
      name: file.name,
      category: file.category,
      description: file.description || "",
      targetGroups: file.targetGroups || ["all"],
    });
    setShowEditFileModal(true);
  };

  const saveEditFile = async () => {
    if (!editingFile) return;
    try {
      await api.fileAssets.update(editingFile.id, {
        name: newFile.name,
        category: newFile.category,
        description: newFile.description,
      });
      const updatedFile = { ...editingFile, name: newFile.name, category: newFile.category, description: newFile.description };
      setFileAssets((prev) => prev.map((file) => (file.id === editingFile.id ? updatedFile : file)));
      setShowEditFileModal(false);
      setEditingFile(null);
      setNewFile({ name: "", category: "template", description: "", targetGroups: ["all"] });
    } catch (e) {
      console.error("Error updating file:", e);
      alert("Failed to update file");
    }
  };

  // ---- URL handlers ----
  const canEditAsset = (asset: any) => {
    if (isAdmin) return true;
    const currentUserEmail = localStorage.getItem("seportal_user");
    const currentUserName = localStorage.getItem("seportal_user_name");
    return asset.owner === currentUserEmail || asset.owner === currentUserName;
  };

  const handleEditAsset = (asset: any) => {
    setEditingAsset(asset);
    setNewUrl({
      title: asset.title,
      url: asset.url,
      description: asset.description,
      category: asset.category,
      tags: Array.isArray(asset.tags) ? asset.tags.join(", ") : asset.tags || "",
      owner: asset.owner,
      imageUrl: asset.imageUrl || "",
      productId: asset.product_id || asset.productId || "",
      targetGroups: asset.targetGroups || ["all"],
    });
    setImagePreview(asset.imageUrl || "");
    setShowEditModal(true);
  };

  const saveEditAsset = async () => {
    if (!editingAsset) return;
    try {
      const tags = newUrl.tags.split(",").map((t) => t.trim()).filter((t) => t);
      await api.urlAssets.update(editingAsset.id, {
        title: newUrl.title,
        url: newUrl.url,
        description: newUrl.description,
        category: newUrl.category,
        tags,
        owner: newUrl.owner,
        imageUrl: newUrl.imageUrl,
        productId: newUrl.productId || null,
        icon: getCategoryIcon(newUrl.category),
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
        icon: getCategoryIcon(newUrl.category),
      };
      setUrlAssets((prev) => prev.map((asset) => (asset.id === editingAsset.id ? updatedAsset : asset)));
      setShowEditModal(false);
      setEditingAsset(null);
      setImagePreview("");
      setNewUrl({ title: "", url: "", description: "", category: "resource", tags: "", owner: "", imageUrl: "", productId: "", targetGroups: ["all"] });
    } catch (e) {
      console.error("Error updating asset:", e);
      alert("Failed to update asset");
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    try {
      await api.urlAssets.delete(assetId);
      setUrlAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    } catch (e) {
      console.error("Error deleting asset:", e);
      alert("Failed to delete asset");
    }
  };

  const toggleUrlAssetSelection = (id: string) => {
    setSelectedUrlAssets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    const userEmail = localStorage.getItem("seportal_user") || "anonymous";
    try {
      await api.urlAssets.like(assetId, userEmail);
      const data = await api.urlAssets.getAll();
      const assets = data.map((asset: any) => ({
        ...asset,
        dateAdded: new Date(asset.date_added),
        imageUrl: asset.image_url,
        tags: typeof asset.tags === "string" ? JSON.parse(asset.tags || "[]") : asset.tags || [],
      }));
      setUrlAssets(assets);
      const likedIds = await api.urlAssets.getUserLikes(userEmail);
      setLikedAssets(new Set(likedIds));
    } catch (error) {
      console.error("Failed to like asset:", error);
    }
  };

  // ---- Script handlers ----
  const handleLikeScript = async (scriptId: string) => {
    const userEmail = localStorage.getItem("seportal_user") || "anonymous";
    try {
      await api.scripts.like(scriptId, userEmail);
      const data = await api.scripts.getAll();
      setScripts(data);
      const likedIds = await api.scripts.getUserLikes(userEmail);
      setLikedScripts(new Set(likedIds));
    } catch (e) {
      console.error("Error liking script:", e);
    }
  };

  const handleCopyCode = async (scriptId: string, code: string) => {
    await api.scripts.incrementUses(scriptId);
    navigator.clipboard.writeText(code);
    setScripts((prev) => prev.map((s) => (s.id === scriptId ? { ...s, uses: (s.uses || 0) + 1 } : s)));
    alert("Code copied to clipboard!");
  };

  const deleteScript = async (scriptId: string) => {
    if (!window.confirm("Are you sure you want to delete this script?")) return;
    try {
      await api.scripts.delete(scriptId);
      setScripts((prev) => prev.filter((s) => s.id !== scriptId));
    } catch (e) {
      console.error("Error deleting script:", e);
      alert("Failed to delete script");
    }
  };

  const toggleScriptSelection = (id: string) => {
    setSelectedScripts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- Shared ----
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const productBadge = (pid: string | undefined) => {
    if (!pid) return null;
    const product = products.find((p) => p.id === pid);
    return product ? (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          background: "linear-gradient(135deg, var(--cf-orange), #ff8c42)",
          color: "white",
          borderRadius: "4px",
          letterSpacing: "0.02em",
        }}
      >
        {product.name}
      </span>
    ) : null;
  };

  // ---- Build the unified list ----
  const q = searchTerm.toLowerCase();

  const fileMatches = (file: any) => {
    const matchesSearch = file.name.toLowerCase().includes(q) || (file.description || "").toLowerCase().includes(q);
    const matchesCat = filter === "all" || file.category === filter;
    // Files have no product association: only show when not filtering to a specific product.
    const matchesProduct = productFilter === "all" || productFilter === "none";
    return matchesSearch && matchesCat && matchesProduct;
  };
  const linkMatches = (link: any) => {
    const matchesSearch =
      link.title.toLowerCase().includes(q) ||
      (link.description || "").toLowerCase().includes(q) ||
      (link.tags || []).some((tag: string) => tag.toLowerCase().includes(q));
    const matchesCat = filter === "all" || link.category === filter;
    const matchesProduct =
      productFilter === "all" ||
      (productFilter === "none" && !link.productId && !link.product_id) ||
      link.productId === productFilter ||
      link.product_id === productFilter;
    return matchesSearch && matchesCat && matchesProduct;
  };
  const scriptMatches = (s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
    const matchesCat = filter === "all" || s.category === filter;
    const matchesProduct =
      productFilter === "all" ||
      (productFilter === "none" && !s.productId && !s.product_id) ||
      s.productId === productFilter ||
      s.product_id === productFilter;
    return matchesSearch && matchesCat && matchesProduct;
  };

  const items: any[] = [];
  if (typeFilter === "all" || typeFilter === "files") {
    for (const f of fileAssets) if (fileMatches(f)) items.push({ ...f, _kind: "file" as const });
  }
  if (typeFilter === "all" || typeFilter === "links") {
    for (const l of urlAssets) if (linkMatches(l)) items.push({ ...l, _kind: "link" as const });
  }
  if (typeFilter === "all" || typeFilter === "scripts") {
    for (const s of scripts) if (scriptMatches(s)) items.push({ ...s, _kind: "script" as const });
  }

  const safe = (v: number) => (Number.isNaN(v) ? 0 : v);
  const tsOf = (x: any) => {
    if (x._kind === "link") return safe(x.dateAdded instanceof Date ? x.dateAdded.getTime() : new Date(x.date_added || 0).getTime());
    if (x._kind === "script") return safe(new Date(x.createdAt || x.created_at || x.date || 0).getTime());
    return safe(new Date(x.created_at || x.date || 0).getTime());
  };
  const likesOf = (x: any) => (x._kind === "file" ? 0 : x.likes || 0);
  const usesOf = (x: any) => (x._kind === "file" ? x.downloads || 0 : x.uses || 0);
  const ownerOf = (x: any) => (x._kind === "link" ? x.owner || "" : x._kind === "script" ? x.author || "" : "");

  const mergedAssets = items.sort((a, b) => {
    switch (sortBy) {
      case "likes":
        return likesOf(b) - likesOf(a);
      case "uses":
        return usesOf(b) - usesOf(a);
      case "owner":
        return ownerOf(a).localeCompare(ownerOf(b));
      case "date":
      default:
        return tsOf(b) - tsOf(a);
    }
  });

  // ---- Bulk selection across all kinds ----
  const mergedFileIds = mergedAssets.filter((x) => x._kind === "file").map((x) => x.id);
  const mergedLinkIds = mergedAssets.filter((x) => x._kind === "link").map((x) => x.id);
  const mergedScriptIds = mergedAssets.filter((x) => x._kind === "script").map((x) => x.id);
  const totalVisible = mergedFileIds.length + mergedLinkIds.length + mergedScriptIds.length;
  const totalSelected = selectedFileAssets.size + selectedUrlAssets.size + selectedScripts.size;
  const allMergedSelected =
    totalVisible > 0 &&
    mergedFileIds.every((id) => selectedFileAssets.has(id)) &&
    mergedLinkIds.every((id) => selectedUrlAssets.has(id)) &&
    mergedScriptIds.every((id) => selectedScripts.has(id));

  const toggleAllMerged = () => {
    if (allMergedSelected) {
      setSelectedFileAssets(new Set());
      setSelectedUrlAssets(new Set());
      setSelectedScripts(new Set());
    } else {
      setSelectedFileAssets(new Set(mergedFileIds));
      setSelectedUrlAssets(new Set(mergedLinkIds));
      setSelectedScripts(new Set(mergedScriptIds));
    }
  };

  const bulkDeleteSelected = async () => {
    const fileIds = Array.from(selectedFileAssets);
    const linkIds = Array.from(selectedUrlAssets);
    const scriptIds = Array.from(selectedScripts);
    const total = fileIds.length + linkIds.length + scriptIds.length;
    if (total === 0) {
      alert("No items selected");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${total} selected item${total > 1 ? "s" : ""}?`)) return;
    try {
      if (fileIds.length) {
        await api.fileAssets.bulkDelete(fileIds);
        setFileAssets((prev) => prev.filter((f) => !fileIds.includes(f.id)));
      }
      if (linkIds.length) {
        await api.urlAssets.bulkDelete(linkIds);
        setUrlAssets((prev) => prev.filter((a) => !linkIds.includes(a.id)));
      }
      if (scriptIds.length) {
        await Promise.all(scriptIds.map((id) => api.scripts.delete(id)));
        setScripts((prev) => prev.filter((s) => !scriptIds.includes(s.id)));
      }
      setSelectedFileAssets(new Set());
      setSelectedUrlAssets(new Set());
      setSelectedScripts(new Set());
      alert(`${total} item${total > 1 ? "s" : ""} deleted successfully!`);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      alert("Failed to delete some items");
    }
  };

  const switchType = (t: "all" | "files" | "links" | "scripts") => {
    setTypeFilter(t);
    setFilter("all");
    setProductFilter("all");
  };

  const activeCategories =
    typeFilter === "files"
      ? FILE_CATEGORIES
      : typeFilter === "links"
      ? URL_CATEGORIES
      : typeFilter === "scripts"
      ? SCRIPT_CATEGORIES
      : [];

  const showProductFilter = typeFilter !== "files" && products.length > 0;

  // ---- Card renderers ----
  const renderFileCard = (asset: any, index: number) => (
    <div key={`file-${asset.id}`} className="card animate-in" style={{ animationDelay: `${index * 0.04}s` }}>
      <div style={{ display: "flex", alignItems: "start", gap: "1rem" }}>
        {isAdmin && (
          <input
            type="checkbox"
            checked={selectedFileAssets.has(asset.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleFileAssetSelection(asset.id);
            }}
            style={{ width: "20px", height: "20px", marginTop: "0.5rem", cursor: "pointer" }}
          />
        )}
        <div
          style={{
            fontSize: "2rem",
            lineHeight: 1,
            background: "linear-gradient(135deg, var(--cf-orange-light), var(--cf-orange))",
            borderRadius: "12px",
            padding: "0.75rem",
            boxShadow: "0 4px 12px rgba(246, 130, 31, 0.2)",
          }}
        >
          {asset.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.125rem" }}>{asset.name}</h3>
            <TypeBadge kind="file" />
          </div>
          {asset.description && (
            <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "14px" }}>{asset.description}</p>
          )}
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem", flexWrap: "wrap" }}>
            <span>📦 {asset.size}</span>
            <span>⬇️ {asset.downloads} downloads</span>
            <span>🕐 {asset.date}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={() => handleDownloadFile(asset)} style={{ padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}>
              Download ({asset.downloads || 0})
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
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.875rem", background: "var(--cf-blue)", color: "white", border: "none", borderRadius: "980px", cursor: "pointer" }}
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
  );

  const renderLinkCard = (link: any, index: number) => (
    <div key={`link-${link.id}`} className="card animate-in" style={{ animationDelay: `${index * 0.04}s` }}>
      <div style={{ display: "flex", alignItems: "start", gap: "16px" }}>
        {isAdmin && (
          <input
            type="checkbox"
            checked={selectedUrlAssets.has(link.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleUrlAssetSelection(link.id);
            }}
            style={{ width: "20px", height: "20px", marginTop: "0.5rem", cursor: "pointer" }}
          />
        )}
        {link.imageUrl ? (
          <img
            src={link.imageUrl}
            alt={link.title}
            style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "12px", background: "var(--bg-tertiary)" }}
          />
        ) : (
          <div
            style={{
              fontSize: "32px",
              lineHeight: 1,
              background: "var(--bg-tertiary)",
              borderRadius: "12px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "56px",
              minHeight: "56px",
            }}
          >
            {link.icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 600, letterSpacing: "-0.01em" }}>{link.title}</h3>
                <TypeBadge kind="link" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--cf-blue)", fontSize: "13px", textDecoration: "none", fontWeight: 400 }}
                >
                  {link.url.replace("https://", "").replace("http://", "")} →
                </a>
                {productBadge(link.product_id || link.productId)}
              </div>
            </div>
          </div>

          {link.tags && link.tags.length > 0 && (
            <div className="tags-container">
              {link.tags.map((tag: string, idx: number) => (
                <span key={idx} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p style={{ margin: "12px 0", color: "var(--text-secondary)", lineHeight: 1.47059, fontSize: "15px", letterSpacing: "-0.022em" }}>
            {link.description}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-color)", marginTop: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{link.owner}</span>
              <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{getRelativeTime(link.dateAdded)}</span>
              <button className={`heart-btn ${likedAssets.has(link.id) ? "liked" : ""}`} onClick={() => toggleLike(link.id)}>
                <span className="heart-icon">{likedAssets.has(link.id) ? "♥" : "♡"}</span>
                <span>{link.likes}</span>
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={async () => {
                  await api.urlAssets.incrementUses(link.id);
                  window.open(link.url, "_blank");
                }}
                style={{ padding: "8px 16px", fontSize: "12px" }}
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
                  style={{ padding: "8px 16px", fontSize: "12px", background: "var(--cf-blue)", color: "white", border: "none", borderRadius: "980px", cursor: "pointer", fontWeight: 400, letterSpacing: "-0.01em" }}
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
  );

  const renderScriptCard = (script: any, index: number) => {
    const created = script.createdAt || script.created_at;
    return (
      <div key={`script-${script.id}`} className="card animate-in" style={{ animationDelay: `${index * 0.04}s` }}>
        <div style={{ display: "flex", alignItems: "start", gap: "14px", marginBottom: "14px" }}>
          {isAdmin && (
            <input
              type="checkbox"
              checked={selectedScripts.has(script.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleScriptSelection(script.id);
              }}
              style={{ width: "20px", height: "20px", marginTop: "0.5rem", cursor: "pointer" }}
            />
          )}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.05))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            {script.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontFamily: "'DM Serif Display', serif" }}>{script.name}</h3>
                <TypeBadge kind="script" />
              </div>
              <span className="badge badge-gray" style={{ fontSize: "11px", flexShrink: 0 }}>
                {script.language}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px", maxWidth: "none" }}>{script.description}</p>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span>by {script.author}</span>
              <span>{script.likes} likes</span>
              <span>{script.uses} uses</span>
              <span>{created ? getRelativeTime(new Date(created)) : script.date}</span>
              {productBadge(script.product_id || script.productId)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "14px",
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: "13px",
            overflow: "auto",
            marginBottom: "14px",
          }}
        >
          <pre style={{ margin: 0, color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{script.code}</pre>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => handleCopyCode(script.id, script.code)} className="btn-secondary btn-sm">
            📋 Copy ({script.uses || 0})
          </button>
          <button onClick={() => handleLikeScript(script.id)} className={`btn-sm ${likedScripts.has(script.id) ? "heart-btn liked" : "btn-secondary"}`}>
            {likedScripts.has(script.id) ? "♥" : "♡"} {script.likes}
          </button>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteScript(script.id);
              }}
              type="button"
              className="btn-danger btn-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>📁 Shared Assets</h2>
          <p>Files, links, URLs, and code scripts for the team</p>
          {isAdmin && (
            <span style={{ fontSize: "11px", color: "var(--success)", fontWeight: "600" }}>✓ Admin Mode Active</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => setShowFileModal(true)}>📄 Upload File</button>
          <button onClick={() => setShowModal(true)}>🔗 Add URL</button>
          <button onClick={() => setShowScriptModal(true)}>💻 Share Script</button>
        </div>
      </div>

      {/* Type filter */}
      <div className="filter-buttons" style={{ marginBottom: "1rem" }}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.id}
            className={`filter-btn ${typeFilter === t.id ? "active" : ""}`}
            onClick={() => switchType(t.id)}
            style={{ fontSize: "1rem", padding: "0.75rem 1.25rem" }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: "1", minWidth: "300px" }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search files, links, scripts, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "400" }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-select"
            style={{ padding: "8px 12px", fontSize: "12px", minWidth: "140px" }}
          >
            <option value="date">Date Added</option>
            <option value="likes">Most Liked</option>
            <option value="uses">Most Used</option>
            <option value="owner">Owner / Author</option>
          </select>
        </div>
      </div>

      {/* Category filter (per active type) */}
      {activeCategories.length > 0 && (
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          {activeCategories.map((c) => (
            <button key={c.id} className={`filter-btn ${filter === c.id ? "active" : ""}`} onClick={() => setFilter(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Product filter */}
      {showProductFilter && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Filter by Product</div>
          <div className="filter-buttons">
            <button className={`filter-btn ${productFilter === "all" ? "active" : ""}`} onClick={() => setProductFilter("all")}>
              All Products
            </button>
            <button className={`filter-btn ${productFilter === "none" ? "active" : ""}`} onClick={() => setProductFilter("none")}>
              No Product
            </button>
            {products.map((product: any) => (
              <button key={product.id} className={`filter-btn ${productFilter === product.id ? "active" : ""}`} onClick={() => setProductFilter(product.id)}>
                {product.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bulk toolbar */}
      {isAdmin && totalVisible > 0 && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            margin: "1.25rem 0 1rem",
            padding: "1rem",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" checked={allMergedSelected} onChange={toggleAllMerged} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
            <span style={{ fontWeight: "500" }}>Select All ({totalVisible})</span>
          </label>
          {totalSelected > 0 && (
            <>
              <span style={{ color: "var(--text-secondary)" }}>{totalSelected} selected</span>
              <button onClick={bulkDeleteSelected} className="btn-danger" style={{ marginLeft: "auto" }}>
                Delete Selected ({totalSelected})
              </button>
            </>
          )}
        </div>
      )}

      {/* Unified list */}
      <div style={{ display: "grid", gap: "20px", marginTop: "20px" }}>
        {mergedAssets.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗂️</div>
            <h3 style={{ marginBottom: "0.5rem" }}>Nothing here yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Upload a file, add a URL, or share a script to get started.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowFileModal(true)}>📄 Upload File</button>
              <button onClick={() => setShowModal(true)}>🔗 Add URL</button>
              <button onClick={() => setShowScriptModal(true)}>💻 Share Script</button>
            </div>
          </div>
        ) : (
          mergedAssets.map((item, index) =>
            item._kind === "file"
              ? renderFileCard(item, index)
              : item._kind === "link"
              ? renderLinkCard(item, index)
              : renderScriptCard(item, index)
          )
        )}
      </div>

      {/* Upload File modal */}
      {showFileModal && (
        <div className="modal-overlay" onClick={fileUploadStatus === "uploading" ? undefined : () => setShowFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Upload File Asset</h3>
              {fileUploadStatus !== "uploading" && (
                <button className="modal-close" onClick={() => setShowFileModal(false)}>
                  ×
                </button>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "14px" }}>
              Files &gt; 25&nbsp;MB are uploaded in 10&nbsp;MB chunks automatically (resumable, survives network interruptions).
            </p>

            {fileUploadError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", fontSize: "13px", color: "#EF4444", marginBottom: "14px" }}>
                {fileUploadError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById("file") as HTMLInputElement;
                const file = fileInput.files?.[0];
                if (!file) {
                  setFileUploadError("Please select a file");
                  return;
                }
                setFileUploadError("");
                setFileUploadPct(0);
                setFileUploadStatus("uploading");
                try {
                  const fileId = Date.now().toString();
                  const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
                  const metadata = {
                    id: fileId,
                    name: newFile.name,
                    category: newFile.category,
                    size: sizeStr,
                    date: new Date().toISOString(),
                    icon: getCategoryIcon(newFile.category),
                    description: newFile.description,
                    targetGroups: newFile.targetGroups,
                  };
                  await api.fileAssets.upload(file, metadata, (pct) => setFileUploadPct(pct));
                  const data = await api.fileAssets.getAll();
                  setFileAssets(data);
                  setShowFileModal(false);
                  setNewFile({ name: "", category: "template", description: "", targetGroups: ["all"] });
                  setFileUploadStatus("idle");
                  setFileUploadPct(0);
                } catch (error: any) {
                  console.error("Error uploading file:", error);
                  setFileUploadError(error?.message || "Upload failed");
                  setFileUploadStatus("error");
                }
              }}
            >
              <div className="form-group">
                <label htmlFor="file">File *</label>
                <input id="file" type="file" className="form-input" required disabled={fileUploadStatus === "uploading"} style={{ padding: "8px" }} />
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
                  disabled={fileUploadStatus === "uploading"}
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
                  disabled={fileUploadStatus === "uploading"}
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
                  disabled={fileUploadStatus === "uploading"}
                  style={{ resize: "vertical" }}
                />
              </div>

              <GroupSelector selectedGroups={newFile.targetGroups} onChange={(groups) => setNewFile({ ...newFile, targetGroups: groups })} />

              {fileUploadStatus === "uploading" && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                    Uploading... {fileUploadPct}% &middot; please don&apos;t close this tab
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--bg-tertiary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${fileUploadPct}%`, background: "linear-gradient(90deg, var(--cf-orange), #F59E0B)", transition: "width 0.2s ease" }} />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                {fileUploadStatus !== "uploading" && (
                  <button type="button" className="btn-secondary" onClick={() => { setShowFileModal(false); setFileUploadError(""); }}>
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={fileUploadStatus === "uploading"}>
                  {fileUploadStatus === "uploading" ? `Uploading ${fileUploadPct}%` : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add URL modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Share a URL</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
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
                  tags: newUrl.tags.split(",").map((t) => t.trim()).filter((t) => t),
                  productId: newUrl.productId || null,
                  targetGroups: newUrl.targetGroups,
                };
                try {
                  await api.urlAssets.create(newAsset);
                  setUrlAssets((prev) => [{ ...newAsset, dateAdded: new Date() }, ...prev]);
                  setShowModal(false);
                  setImagePreview("");
                  setNewUrl({ title: "", url: "", description: "", category: "resource", tags: "", owner: "", imageUrl: "", productId: "", targetGroups: ["all"] });
                } catch (error) {
                  console.error("Error adding URL:", error);
                  alert("Failed to add URL");
                }
              }}
            >
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input id="title" type="text" className="form-input" value={newUrl.title} onChange={(e) => setNewUrl({ ...newUrl, title: e.target.value })} placeholder="e.g., Cloudflare Workers Guide" required />
              </div>

              <div className="form-group">
                <label htmlFor="url">URL *</label>
                <input id="url" type="url" className="form-input" value={newUrl.url} onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })} placeholder="https://example.com" required />
              </div>

              <div className="form-group">
                <label htmlFor="owner">Your Name *</label>
                <input id="owner" type="text" className="form-input" value={newUrl.owner} onChange={(e) => setNewUrl({ ...newUrl, owner: e.target.value })} placeholder="e.g., John Doe" required />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" className="form-select" value={newUrl.category} onChange={(e) => setNewUrl({ ...newUrl, category: e.target.value })}>
                  <option value="documentation">Documentation</option>
                  <option value="resource">Resource</option>
                  <option value="guide">Guide</option>
                  <option value="code">Code</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="product">Product (optional)</label>
                <select id="product" className="form-select" value={newUrl.productId} onChange={(e) => setNewUrl({ ...newUrl, productId: e.target.value })}>
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
                <input id="tags" type="text" className="form-input" value={newUrl.tags} onChange={(e) => setNewUrl({ ...newUrl, tags: e.target.value })} placeholder="e.g., workers, serverless, api" />
              </div>

              <div className="form-group">
                <label htmlFor="image">Logo / Image (optional)</label>
                <input id="image" type="file" accept="image/*" className="form-input" onChange={handleImageUpload} style={{ padding: "8px" }} />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px", marginTop: "12px", border: "1px solid var(--border-color)" }} />
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
                  style={{ resize: "vertical" }}
                />
              </div>

              <GroupSelector selectedGroups={newUrl.targetGroups} onChange={(groups) => setNewUrl({ ...newUrl, targetGroups: groups })} />

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

      {/* Share Script modal */}
      {showScriptModal && (
        <div className="modal-overlay" onClick={() => setShowScriptModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💻 Share a Script</h3>
              <button className="modal-close" onClick={() => setShowScriptModal(false)}>
                ×
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const scriptData = {
                  id: Date.now().toString(),
                  name: newScript.name,
                  language: newScript.language,
                  category: newScript.category,
                  description: newScript.description,
                  author: newScript.author,
                  code: newScript.code,
                  productId: newScript.productId,
                  likes: 0,
                  uses: 0,
                  date: "Just now",
                  createdAt: new Date().toISOString(),
                  icon: getScriptIcon(newScript.category),
                  targetGroups: newScript.targetGroups,
                };
                try {
                  await api.scripts.create(scriptData);
                  setScripts((prev) => [scriptData, ...prev]);
                  setShowScriptModal(false);
                  setNewScript({ name: "", language: "javascript", category: "api", description: "", author: "", code: "", productId: "", targetGroups: ["all"] });
                } catch (error) {
                  console.error("Error sharing script:", error);
                  alert("Failed to share script");
                }
              }}
            >
              <div className="form-group">
                <label htmlFor="script-name">Script Name</label>
                <input id="script-name" type="text" className="form-input" value={newScript.name} onChange={(e) => setNewScript({ ...newScript, name: e.target.value })} placeholder="e.g., Cloudflare API Auth Helper" required />
              </div>
              <div className="form-group">
                <label htmlFor="script-author">Your Name</label>
                <input id="script-author" type="text" className="form-input" value={newScript.author} onChange={(e) => setNewScript({ ...newScript, author: e.target.value })} placeholder="e.g., John Doe" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label htmlFor="script-language">Language</label>
                  <select id="script-language" className="form-select" value={newScript.language} onChange={(e) => setNewScript({ ...newScript, language: e.target.value })}>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                    <option value="sql">SQL</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="script-category">Category</label>
                  <select id="script-category" className="form-select" value={newScript.category} onChange={(e) => setNewScript({ ...newScript, category: e.target.value })}>
                    <option value="api">API</option>
                    <option value="automation">Automation</option>
                    <option value="database">Database</option>
                    <option value="security">Security</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>
              </div>
              {products.length > 0 && (
                <div className="form-group">
                  <label htmlFor="script-product">Product (optional)</label>
                  <select id="script-product" className="form-select" value={newScript.productId} onChange={(e) => setNewScript({ ...newScript, productId: e.target.value })}>
                    <option value="">-- No specific product --</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="script-description">Description</label>
                <textarea
                  id="script-description"
                  className="form-input"
                  value={newScript.description}
                  onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                  placeholder="Brief description of what this script does"
                  required
                  rows={3}
                  style={{ minHeight: "80px", resize: "vertical" }}
                />
              </div>
              <GroupSelector selectedGroups={newScript.targetGroups} onChange={(groups) => setNewScript({ ...newScript, targetGroups: groups })} />
              <div className="form-group">
                <label htmlFor="script-code">Code</label>
                <textarea
                  id="script-code"
                  className="form-input"
                  value={newScript.code}
                  onChange={(e) => setNewScript({ ...newScript, code: e.target.value })}
                  placeholder="Paste your code here..."
                  required
                  rows={10}
                  style={{ fontFamily: "Monaco, Consolas, monospace", fontSize: "13px", minHeight: "200px", resize: "vertical" }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowScriptModal(false)}>
                  Cancel
                </button>
                <button type="submit">Share Script</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit URL modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Asset</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEditAsset();
              }}
            >
              <div className="form-group">
                <label htmlFor="edit-title">Title *</label>
                <input id="edit-title" type="text" className="form-input" value={newUrl.title} onChange={(e) => setNewUrl({ ...newUrl, title: e.target.value })} placeholder="e.g., Cloudflare Workers Guide" required />
              </div>

              <div className="form-group">
                <label htmlFor="edit-url">URL *</label>
                <input id="edit-url" type="url" className="form-input" value={newUrl.url} onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })} placeholder="https://example.com" required />
              </div>

              <div className="form-group">
                <label htmlFor="edit-owner">Owner *</label>
                <input id="edit-owner" type="text" className="form-input" value={newUrl.owner} onChange={(e) => setNewUrl({ ...newUrl, owner: e.target.value })} placeholder="e.g., John Doe" required />
              </div>

              <div className="form-group">
                <label htmlFor="edit-category">Category</label>
                <select id="edit-category" className="form-select" value={newUrl.category} onChange={(e) => setNewUrl({ ...newUrl, category: e.target.value })}>
                  <option value="documentation">Documentation</option>
                  <option value="resource">Resource</option>
                  <option value="guide">Guide</option>
                  <option value="code">Code</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-product">Product (optional)</label>
                <select id="edit-product" className="form-select" value={newUrl.productId} onChange={(e) => setNewUrl({ ...newUrl, productId: e.target.value })}>
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
                <input id="edit-tags" type="text" className="form-input" value={newUrl.tags} onChange={(e) => setNewUrl({ ...newUrl, tags: e.target.value })} placeholder="e.g., workers, serverless, api" />
              </div>

              <div className="form-group">
                <label htmlFor="edit-image">Logo / Image (optional)</label>
                <input id="edit-image" type="file" accept="image/*" className="form-input" onChange={handleImageUpload} style={{ padding: "8px" }} />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px", marginTop: "12px", border: "1px solid var(--border-color)" }} />
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
                  style={{ resize: "vertical" }}
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

      {/* Edit File modal */}
      {showEditFileModal && (
        <div className="modal-overlay" onClick={() => setShowEditFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit File</h3>
              <button className="modal-close" onClick={() => setShowEditFileModal(false)}>
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEditFile();
              }}
            >
              <div className="form-group">
                <label htmlFor="fileName">File Name *</label>
                <input id="fileName" type="text" className="form-input" value={newFile.name} onChange={(e) => setNewFile({ ...newFile, name: e.target.value })} placeholder="e.g., Customer Demo Template" required />
              </div>

              <div className="form-group">
                <label htmlFor="fileCategory">Category</label>
                <select id="fileCategory" className="form-select" value={newFile.category} onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}>
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
                  style={{ resize: "vertical" }}
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

      <div style={{ marginTop: "3rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem", paddingBottom: "2rem" }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
