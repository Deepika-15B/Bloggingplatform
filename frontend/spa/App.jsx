/* global React, ReactDOM */

const { useEffect, useMemo, useState, useCallback, useRef } = React;

// Route relative /api requests to API server when running the SPA on :3000
(() => {
  try {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (typeof url === 'string' && url.startsWith('/api/')) {
          const base = (window.location && window.location.port === '3000') ? 'http://localhost:5000' : '';
          return originalFetch(base + url, init);
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
  } catch (_) {}
})();

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function Navbar() {
  return (
    <nav className="navbar" style={styles.navbar}>
      <div className="logo" style={styles.logo}>🌟 MyBlog</div>
      <ul className="nav-links" style={styles.navLinks}>
        <li><a href="#/dashboard" style={styles.navLink}>Home</a></li>
        <li><a href="#/create-post" style={styles.navLink}>Create</a></li>
        <li><a href="#/categories" style={styles.navLink}>Categories</a></li>
        <li><a href="#/admin-login" style={styles.navLink}>Admin</a></li>
        <li><a href="#/login" style={styles.navLink}>Logout</a></li>
      </ul>
      <div className="profile-btn">
        <button style={styles.profileBtn} onClick={() => { window.location.hash = '#/profile'; }}>Profile</button>
      </div>
    </nav>
  );
}

function Profile() {
  const [currentUser, setCurrentUser] = useLocalStorageState("currentUser", null);
  const [stats, setStats] = useState({ posts: 0, likes: 0, comments: 0 });
  const [userProfile, setUserProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !currentUser.name) {
      alert("Please login first!");
      window.location.hash = "#/login";
      return;
    }
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/posts");
        const posts = await res.json();
        if (res.ok) {
          const userPosts = posts.filter(
            (p) => p.author && (p.author.username === currentUser.name || p.author.fullName === currentUser.name)
          );
          const postsCount = userPosts.length;
          const likesCount = userPosts.reduce((t, p) => t + (p.likes ? p.likes.length : 0), 0);
          const commentsCount = userPosts.reduce((t, p) => t + (p.comments ? p.comments.length : 0), 0);
          setStats({ posts: postsCount, likes: likesCount, comments: commentsCount });
        }
      } catch (e) {
        console.error("Error loading user stats:", e);
      }
    }
    
    async function loadUserProfile() {
      try {
        const res = await fetch(`/api/users/profile/${currentUser.name}`);
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data.user);
        }
      } catch (e) {
        console.error("Error loading user profile:", e);
      }
    }
    
    if (currentUser && currentUser.name) {
      loadStats();
      loadUserProfile();
    }
  }, [currentUser]);

  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState({ 
    fullName: "", 
    username: "", 
    email: "", 
    profilePicture: null,
    bio: "",
    socialLinks: {
      twitter: "",
      linkedin: "",
      github: "",
      website: ""
    }
  });

  const openEdit = useCallback(() => {
    if (!currentUser) return;
    setEdit({
      fullName: currentUser.fullName || currentUser.name || "",
      username: currentUser.name || "",
      email: currentUser.email || "",
      profilePicture: currentUser.profilePicture || null,
      bio: userProfile?.bio || "",
      socialLinks: {
        twitter: userProfile?.socialLinks?.twitter || "",
        linkedin: userProfile?.socialLinks?.linkedin || "",
        github: userProfile?.socialLinks?.github || "",
        website: userProfile?.socialLinks?.website || ""
      }
    });
    setIsEditing(true);
  }, [currentUser, userProfile]);

  const closeEdit = useCallback(() => setIsEditing(false), []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEdit((prev) => ({ ...prev, profilePicture: ev.target.result }));
    };
    reader.readAsDataURL(file);
  }, []);

  const saveChanges = useCallback(async (e) => {
    e.preventDefault();
    try {
      // Update local storage
      const updated = {
        ...currentUser,
        fullName: edit.fullName,
        name: edit.username,
        email: edit.email,
        profilePicture: edit.profilePicture || currentUser?.profilePicture || null,
      };
      window.localStorage.setItem("currentUser", JSON.stringify(updated));
      setCurrentUser(updated);
      
      // Update server
      const response = await fetch(`/api/users/profile/${edit.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: edit.bio,
          socialLinks: edit.socialLinks
        })
      });
      
      if (response.ok) {
        setIsEditing(false);
        alert("Profile updated successfully!");
        // Reload profile data
        const profileRes = await fetch(`/api/users/profile/${edit.username}`);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setUserProfile(data.user);
        }
      } else {
        throw new Error('Failed to update profile on server');
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error updating profile. Please try again.");
    }
  }, [currentUser, edit, setCurrentUser]);

  const avatarSourceName = currentUser && (currentUser.fullName || currentUser.name) ? (currentUser.fullName || currentUser.name) : "?";
  const avatarLetter = avatarSourceName.slice(0, 1).toUpperCase();

  return (
    <div style={styles.pageBg}>
      <Navbar />
      <div className="profile-container" style={styles.profileContainer}>
        <div className="profile-header" style={styles.profileHeader}>
          <div className="profile-avatar" style={styles.profileAvatar}>
            {currentUser && currentUser.profilePicture ? (
              <img alt="Profile" src={currentUser.profilePicture} style={styles.profileAvatarImg} />
            ) : (
              <div id="profileAvatarText" style={styles.profileAvatarText}>{avatarLetter}</div>
            )}
          </div>
          <h1 className="profile-name" style={styles.profileName}>{(currentUser && (currentUser.fullName || currentUser.name)) || "Loading..."}</h1>
          <p className="profile-username" style={styles.profileUsername}>@{currentUser ? currentUser.name : ''}</p>
          <p className="profile-email" style={styles.profileEmail}>{currentUser && currentUser.email ? currentUser.email : 'No email available'}</p>
          
          {/* Bio */}
          {userProfile?.bio && (
            <p className="profile-bio" style={{...styles.profileEmail, marginTop: 15, fontStyle: 'italic'}}>
              "{userProfile.bio}"
            </p>
          )}
          
          {/* Social Links */}
          {userProfile?.socialLinks && (
            <div className="social-links" style={{marginTop: 20, display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap'}}>
              {userProfile.socialLinks.twitter && (
                <a href={userProfile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" style={{color: '#1da1f2', textDecoration: 'none', fontSize: '1.2rem'}}>
                  🐦 Twitter
                </a>
              )}
              {userProfile.socialLinks.linkedin && (
                <a href={userProfile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{color: '#0077b5', textDecoration: 'none', fontSize: '1.2rem'}}>
                  💼 LinkedIn
                </a>
              )}
              {userProfile.socialLinks.github && (
                <a href={userProfile.socialLinks.github} target="_blank" rel="noopener noreferrer" style={{color: '#333', textDecoration: 'none', fontSize: '1.2rem'}}>
                  🐙 GitHub
                </a>
              )}
              {userProfile.socialLinks.website && (
                <a href={userProfile.socialLinks.website} target="_blank" rel="noopener noreferrer" style={{color: '#ff7eb3', textDecoration: 'none', fontSize: '1.2rem'}}>
                  🌐 Website
                </a>
              )}
            </div>
          )}
        </div>

        <div className="profile-stats" style={styles.profileStats}>
          <div className="stat-card" style={styles.statCard}>
            <span className="stat-number" style={styles.statNumber}>{stats.posts}</span>
            <span className="stat-label" style={styles.statLabel}>Total Posts</span>
          </div>
          <div className="stat-card" style={styles.statCard}>
            <span className="stat-number" style={styles.statNumber}>{userProfile?.followerCount || 0}</span>
            <span className="stat-label" style={styles.statLabel}>Followers</span>
          </div>
          <div className="stat-card" style={styles.statCard}>
            <span className="stat-number" style={styles.statNumber}>{userProfile?.followingCount || 0}</span>
            <span className="stat-label" style={styles.statLabel}>Following</span>
          </div>
          <div className="stat-card" style={styles.statCard}>
            <span className="stat-number" style={styles.statNumber}>{stats.likes}</span>
            <span className="stat-label" style={styles.statLabel}>Total Likes</span>
          </div>
        </div>

        <div className="profile-actions" style={styles.profileActions}>
          <h3 className="action-title" style={styles.actionTitle}>Profile Actions</h3>
          <div className="action-buttons" style={styles.actionButtons}>
            <button className="action-btn btn-primary" style={{...styles.actionBtn, ...styles.btnPrimary}} onClick={() => { window.localStorage.setItem('filterMyPosts', 'true'); window.location.hash = '#/dashboard'; }}>
              <i className="fas fa-list"></i>
              <span style={{marginLeft: 8}}>View My Posts</span>
            </button>
            <button className="action-btn btn-secondary" style={{...styles.actionBtn, ...styles.btnSecondary}} onClick={openEdit}>
              <i className="fas fa-edit"></i>
              <span style={{marginLeft: 8}}>Edit Profile</span>
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="modal" style={styles.modal} onClick={(e) => { if (e.target === e.currentTarget) setIsEditing(false); }}>
            <div className="modal-content" style={styles.modalContent}>
              <div className="modal-header" style={styles.modalHeader}>
                <h3 style={styles.modalHeaderTitle}>Edit Profile</h3>
                <span className="close" style={styles.close} onClick={closeEdit}>&times;</span>
              </div>
              <form id="editProfileForm" className="edit-form" style={styles.editForm} onSubmit={saveChanges}>
                <div className="form-group" style={styles.formGroup}>
                  <label htmlFor="editFullName" style={styles.formLabel}>Full Name</label>
                  <input type="text" id="editFullName" required value={edit.fullName} onChange={(e) => setEdit((p) => ({...p, fullName: e.target.value}))} style={styles.input} />
                </div>
                <div className="form-group" style={styles.formGroup}>
                  <label htmlFor="editUsername" style={styles.formLabel}>Username</label>
                  <input type="text" id="editUsername" required value={edit.username} onChange={(e) => setEdit((p) => ({...p, username: e.target.value}))} style={styles.input} />
                </div>
                <div className="form-group" style={styles.formGroup}>
                  <label htmlFor="editEmail" style={styles.formLabel}>Email</label>
                  <input type="email" id="editEmail" required value={edit.email} onChange={(e) => setEdit((p) => ({...p, email: e.target.value}))} style={styles.input} />
                </div>
                <div className="form-group" style={styles.formGroup}>
                  <label htmlFor="editBio" style={styles.formLabel}>Bio</label>
                  <textarea id="editBio" value={edit.bio} onChange={(e) => setEdit((p) => ({...p, bio: e.target.value}))} style={{...styles.input, minHeight: 80}} placeholder="Tell us about yourself..." maxLength={500} />
                </div>
                <div className="form-group" style={styles.formGroup}>
                  <label style={styles.formLabel}>Social Links</label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
                    <div>
                      <label style={{fontSize: '0.8rem', color: '#666', marginBottom: 5}}>Twitter</label>
                      <input type="url" value={edit.socialLinks.twitter} onChange={(e) => setEdit((p) => ({...p, socialLinks: {...p.socialLinks, twitter: e.target.value}}))} style={styles.input} placeholder="https://twitter.com/username" />
                    </div>
                    <div>
                      <label style={{fontSize: '0.8rem', color: '#666', marginBottom: 5}}>LinkedIn</label>
                      <input type="url" value={edit.socialLinks.linkedin} onChange={(e) => setEdit((p) => ({...p, socialLinks: {...p.socialLinks, linkedin: e.target.value}}))} style={styles.input} placeholder="https://linkedin.com/in/username" />
                    </div>
                    <div>
                      <label style={{fontSize: '0.8rem', color: '#666', marginBottom: 5}}>GitHub</label>
                      <input type="url" value={edit.socialLinks.github} onChange={(e) => setEdit((p) => ({...p, socialLinks: {...p.socialLinks, github: e.target.value}}))} style={styles.input} placeholder="https://github.com/username" />
                    </div>
                    <div>
                      <label style={{fontSize: '0.8rem', color: '#666', marginBottom: 5}}>Website</label>
                      <input type="url" value={edit.socialLinks.website} onChange={(e) => setEdit((p) => ({...p, socialLinks: {...p.socialLinks, website: e.target.value}}))} style={styles.input} placeholder="https://yourwebsite.com" />
                    </div>
                  </div>
                </div>
                <div className="form-group" style={styles.formGroup}>
                  <label htmlFor="profilePicture" style={styles.formLabel}>Profile Picture</label>
                  <div className="image-upload-container" style={{textAlign:'center'}}>
                    <div className="current-image" style={{marginBottom: 20}}>
                      {edit.profilePicture ? (
                        <img src={edit.profilePicture} alt="Profile" style={styles.previewImg} />
                      ) : (
                        <div style={styles.defaultAvatar}>{avatarLetter}</div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" id="profilePicture" accept="image/*" style={{display:'none'}} onChange={handleFileChange} />
                    <label htmlFor="profilePicture" className="upload-btn" style={styles.uploadBtn} onClick={(e) => { e.preventDefault(); if (fileInputRef.current) fileInputRef.current.click(); }}>
                      <i className="fas fa-camera"></i>
                      <span style={{marginLeft: 8}}>Choose Image</span>
                    </label>
                  </div>
                </div>
                <div className="form-actions" style={styles.formActions}>
                  <button type="button" className="btn-cancel" style={styles.btnCancel} onClick={closeEdit}>Cancel</button>
                  <button type="submit" className="btn-save" style={styles.btnSave}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageBg: {
    minHeight: '100vh',
    background: "url('bg4.avif') no-repeat center center fixed",
    backgroundSize: 'cover',
    position: 'relative',
  },
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px',
    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.2)',
    position: 'sticky', top: 0, zIndex: 1000,
  },
  logo: { fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: 1 },
  navLinks: { listStyle: 'none', display: 'flex', gap: 25, margin: 0, padding: 0 },
  navLink: { textDecoration: 'none', color: '#fff', fontSize: '1rem', fontWeight: 500, position: 'relative' },
  profileBtn: { padding: '8px 16px', border: 'none', borderRadius: 20, background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  profileContainer: { maxWidth: 800, margin: '40px auto', padding: '0 20px', position: 'relative', zIndex: 1 },
  profileHeader: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)', borderRadius: 20, padding: 40, textAlign: 'center', marginBottom: 30, border: '1px solid rgba(255,255,255,0.2)' },
  profileAvatar: { width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '3rem', color: '#fff', fontWeight: 700 },
  profileAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  profileAvatarText: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  profileName: { fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginBottom: 10, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' },
  profileUsername: { fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  profileEmail: { fontSize: '1rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 25, display: 'inline-block' },
  profileStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 },
  statCard: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)', borderRadius: 15, padding: 25, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', transition: 'transform 0.3s ease' },
  statNumber: { fontSize: '2.5rem', fontWeight: 700, color: '#ff7eb3', display: 'block', marginBottom: 10 },
  statLabel: { color: '#fff', fontSize: '1rem', fontWeight: 500 },
  profileActions: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)', borderRadius: 20, padding: 30, border: '1px solid rgba(255,255,255,0.2)' },
  actionTitle: { color: '#fff', fontSize: '1.5rem', fontWeight: 600, marginBottom: 20, textAlign: 'center' },
  actionButtons: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 },
  actionBtn: { padding: '15px 25px', border: 'none', borderRadius: 25, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnPrimary: { background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', color: '#fff' },
  btnSecondary: { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' },
  modal: { position: 'fixed', zIndex: 2000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' },
  modalContent: { background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', margin: '5% auto', padding: 0, borderRadius: 20, width: '90%', maxWidth: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 30px', borderBottom: '1px solid rgba(0,0,0,0.1)' },
  modalHeaderTitle: { margin: 0, color: '#333', fontSize: '1.5rem', fontWeight: 600 },
  close: { color: '#aaa', fontSize: 28, fontWeight: 'bold', cursor: 'pointer' },
  editForm: { padding: 30 },
  formGroup: { marginBottom: 25 },
  formLabel: { display: 'block', marginBottom: 8, color: '#333', fontWeight: 600, fontSize: '0.95rem' },
  input: { width: '100%', padding: '12px 16px', border: '2px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: '1rem', boxSizing: 'border-box' },
  previewImg: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #ff7eb3', margin: '0 auto', display: 'block' },
  defaultAvatar: { width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', color: '#fff', fontWeight: 700, fontSize: '2.5rem', border: '3px solid #ff7eb3', margin: '0 auto' },
  uploadBtn: { display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', color: '#fff', borderRadius: 25, cursor: 'pointer', fontWeight: 600 },
  formActions: { display: 'flex', gap: 15, justifyContent: 'flex-end', marginTop: 30 },
  btnCancel: { padding: '12px 24px', border: 'none', borderRadius: 25, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.1)', color: '#333' },
  btnSave: { padding: '12px 24px', border: 'none', borderRadius: 25, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#ff7eb3,#ff758c)', color: '#fff' },
};

function Signup() {
  const [alert, setAlert] = useState({ visible: false, type: 'danger', message: '' });
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', country: '', password: '', confirmPassword: '', dob: '', gender: '', category: '', bio: '', profilePic: ''
  });

  const showAlert = (msg, type = 'danger') => setAlert({ visible: true, type, message: msg });
  const updateProgress = () => {
    const values = Object.values(form);
    const total = values.length;
    const filled = values.filter(v => (typeof v === 'string' ? v.trim() !== '' : !!v)).length;
    setProgress(Math.round((filled / total) * 100));
  };
  useEffect(updateProgress, [form]);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, termsAccepted: true };
    if (!data.fullName || !data.username || !data.email || !data.password || !data.confirmPassword || !data.dob || !data.country) {
      showAlert('Please fill in all required fields.');
      return;
    }
    if (data.password !== data.confirmPassword) { showAlert('Passwords do not match.'); return; }
    if (data.password.length < 6) { showAlert('Password must be at least 6 characters.'); return; }
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (res.ok) {
        window.localStorage.setItem('currentUser', JSON.stringify({ name: data.username, fullName: data.fullName, email: data.email }));
        setAlert({ visible: true, type: 'success', message: 'Account created successfully! Redirecting...' });
        setTimeout(() => { window.location.hash = '#/profile'; }, 800);
      } else {
        showAlert(result.message || 'Signup failed.');
      }
    } catch {
      showAlert('Server error. Please try again later.');
    }
  };

  return (
    <div style={{minHeight:'100vh', padding:20, background: 'linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100%)', backgroundSize:'400% 400%', animation:'gradientShift 15s ease infinite'}}>
      <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      <div style={{maxWidth:600, margin:'40px auto', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(30px)', borderRadius:24, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)', padding:48, border:'1px solid rgba(255,255,255,0.3)'}}>
        <div style={{textAlign:'center', marginBottom:40}}>
          <div style={{width:80,height:80,background:'linear-gradient(135deg,#667eea,#764ba2)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',color:'#fff',fontSize:32,boxShadow:'0 8px 25px rgba(102,126,234,0.3)'}}>➕</div>
          <h1 style={{color:'#1a202c',fontSize:36,fontWeight:700,marginBottom:12,background:'linear-gradient(135deg,#667eea,#764ba2)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Create Account</h1>
          <p style={{color:'#718096'}}>Join our community and start sharing your stories</p>
        </div>
        <div style={{width:'100%', height:6, background:'rgba(226,232,240,0.5)', borderRadius:3, marginBottom:28}}>
          <div style={{height:'100%', background:'linear-gradient(90deg,#667eea,#764ba2)', width:`${progress}%`, transition:'width .4s ease', borderRadius:3}}></div>
        </div>
        {alert.visible && (
          <div style={{borderRadius:16, padding:'18px 22px', marginBottom:28, fontWeight:500, backdropFilter:'blur(10px)', background: alert.type==='success' ? 'rgba(209,250,229,0.9)' : 'rgba(254,226,226,0.9)', color: alert.type==='success' ? '#065f46' : '#991b1b', borderLeft: `4px solid ${alert.type==='success' ? '#10b981' : '#ef4444'}`}}>
            {alert.message}
          </div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
            <div>
              <label style={{display:'block', marginBottom:10, color:'#2d3748', fontWeight:600, fontSize:15}}>Full Name</label>
              <input value={form.fullName} onChange={onChange('fullName')} placeholder="Enter your full name" style={signupStyles.input} required />
            </div>
            <div>
              <label style={{display:'block', marginBottom:10, color:'#2d3748', fontWeight:600, fontSize:15}}>Username</label>
              <input value={form.username} onChange={onChange('username')} placeholder="Choose a username" style={signupStyles.input} required />
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
            <div>
              <label style={signupStyles.label}>Email</label>
              <input type="email" value={form.email} onChange={onChange('email')} placeholder="Enter your email" style={signupStyles.input} required />
            </div>
            <div>
              <label style={signupStyles.label}>Country</label>
              <input value={form.country} onChange={onChange('country')} placeholder="Your country" style={signupStyles.input} required />
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
            <div>
              <label style={signupStyles.label}>Password</label>
              <input type="password" value={form.password} onChange={onChange('password')} placeholder="Min 6 characters" minLength={6} style={signupStyles.input} required />
            </div>
            <div>
              <label style={signupStyles.label}>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={onChange('confirmPassword')} placeholder="Confirm your password" style={signupStyles.input} required />
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
            <div>
              <label style={signupStyles.label}>Date of Birth</label>
              <input type="date" value={form.dob} onChange={onChange('dob')} style={signupStyles.input} required />
            </div>
            <div>
              <label style={signupStyles.label}>Gender</label>
              <select value={form.gender} onChange={onChange('gender')} style={signupStyles.input}>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label style={signupStyles.label}>Favorite Blog Category</label>
            <select value={form.category} onChange={onChange('category')} style={signupStyles.input} required>
              <option value="">Choose your favorite category</option>
              <option>Technology</option>
              <option>Travel</option>
              <option>Food & Cooking</option>
              <option>Lifestyle</option>
              <option>Health & Fitness</option>
              <option>Business</option>
              <option>Education</option>
              <option>Entertainment</option>
            </select>
          </div>
          <div>
            <label style={signupStyles.label}>Short Bio</label>
            <textarea value={form.bio} onChange={onChange('bio')} maxLength={200} placeholder="Tell us a bit about yourself (max 200 characters)" style={{...signupStyles.input, minHeight:120}} />
          </div>
          <div>
            <label style={signupStyles.label}>Profile Picture URL</label>
            <input type="url" value={form.profilePic} onChange={onChange('profilePic')} placeholder="Optional: Add a profile picture URL" style={signupStyles.input} />
          </div>
          <button type="submit" style={signupStyles.submit}>Create Account</button>
          <div style={{textAlign:'center', marginTop:28}}>
            <a href="#/login" style={{color:'#667eea', textDecoration:'none', fontWeight:600}}>Already have an account? <strong>Sign In</strong></a>
          </div>
        </form>
      </div>
    </div>
  );
}

const signupStyles = {
  input: { width:'100%', padding:'18px 22px', border:'2px solid #e2e8f0', borderRadius:16, fontSize:16, fontWeight:500, color:'#1a202c', background:'rgba(248,250,252,0.8)' },
  label: { display:'block', marginBottom:10, color:'#2d3748', fontWeight:600, fontSize:15 },
  submit: { width:'100%', padding:20, background:'linear-gradient(135deg,#667eea 0%, #764ba2 100%)', border:'none', borderRadius:16, color:'#fff', fontSize:18, fontWeight:600, cursor:'pointer', boxShadow:'0 8px 25px rgba(102,126,234,0.3)', marginTop:8 }
};

function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('currentUser')), []);

  useEffect(() => {
    const user = JSON.parse(window.localStorage.getItem('currentUser'));
    if (!user || !user.name) { alert('Please login first!'); window.location.hash = '#/login'; return; }

    const selectedCategory = window.localStorage.getItem('selectedCategory');
    const filterMyPosts = window.localStorage.getItem('filterMyPosts');
    if (selectedCategory) { setSearch(selectedCategory); window.localStorage.removeItem('selectedCategory'); }
    if (filterMyPosts === 'true') { setSearch('my-posts'); window.localStorage.removeItem('filterMyPosts'); }
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to fetch posts');
      setPosts(data);
    } catch (e) {
      console.error('Error fetching posts:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFollowingFeed() {
    try {
      if (!currentUser || !currentUser.name) return;
      setLoading(true);
      const res = await fetch(`/api/users/feed/${currentUser.name}`);
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to fetch following feed');
      setPosts(data);
    } catch (e) {
      console.error('Error fetching following feed:', e);
    } finally {
      setLoading(false);
    }
  }

  // React to search changes that require server-side filtering
  useEffect(() => {
    if (search === 'following') {
      fetchFollowingFeed();
    } else if (!search || search === 'my-posts') {
      // reload full list; client-side will filter for my-posts
      fetchPosts();
    }
    // other values (categories or text) are handled client-side from full list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function likePost(postId) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!currentUser) { alert('Please login to like posts'); return; }
      const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorUsername: currentUser.name }) });
      if (response.ok) fetchPosts(); else alert('Error liking post');
    } catch (e) { console.error('Error liking post:', e); alert('Error liking post'); }
  }

  async function followUser(authorId, authorUsername) {
    try {
      console.log('Follow user called with:', { authorId, authorUsername });
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      console.log('Current user:', currentUser);
      
      if (!currentUser) { alert('Please login to follow users'); return; }
      if (currentUser.name === authorUsername) { alert('You cannot follow yourself'); return; }
      
      console.log('Making follow request...');
      const response = await fetch(`/api/users/follow/${authorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerUsername: currentUser.name })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Follow result:', result);
        alert(result.message);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        alert('Error following user');
      }
    } catch (e) {
      console.error('Error following user:', e);
      alert('Error following user');
    }
  }

  async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (response.ok) fetchPosts(); else alert('Error deleting post');
    } catch (e) { console.error('Error deleting post:', e); alert('Error deleting post'); }
  }

  const filtered = useMemo(() => {
    return posts.filter(post => {
      const matchesTitle = post.title.toLowerCase().includes(search.toLowerCase());
      if (search === 'my-posts') {
        return post.author && (post.author.username === currentUser?.name || post.author.fullName === currentUser?.name);
      }
      if (search === 'following') {
        // Server returns only followed users' posts in posts state
        return true;
      }
      const categories = ['technology','lifestyle','travel','food','health','business','entertainment','education'];
      if (categories.includes(search.toLowerCase())) {
        return post.category && post.category.toLowerCase() === search.toLowerCase();
      }
      return matchesTitle;
    });
  }, [posts, search, currentUser]);

  return (
    <div style={styles.pageBg}>
      <Navbar />
      <div className="search-container" style={{textAlign:'center', margin:'30px 0', display:'flex', justifyContent:'center', gap:15, alignItems:'center', flexWrap:'wrap'}}>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={search==='my-posts'?'🔍 Showing your posts...':search==='following'?'👥 Showing posts from people you follow...':(search?`🔍 Search posts in ${search}...`:'🔍 Search posts by title...')} style={{width:'60%', padding:'14px 22px', borderRadius:50, border:'none', outline:'none', fontSize:16, boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}} />
        <button onClick={()=>setSearch('following')} className="following-btn" style={{padding:'14px 22px', border:'none', borderRadius:50, fontSize:16, background:'rgba(79,172,254,0.8)', color:'#fff', cursor:'pointer', boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>👥 Following</button>
        {search && (
          <button onClick={()=>setSearch('')} className="clear-filter-btn" style={{padding:'14px 22px', border:'none', borderRadius:50, fontSize:16, background:'rgba(255,126,179,0.8)', color:'#fff', cursor:'pointer', boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>Clear Filter</button>
        )}
      </div>
      <div className="feed" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:25, padding:'0 40px 50px'}}>
        {loading ? (<p style={{color:'#fff'}}>Loading posts...</p>) : (
          filtered.length === 0 ? (<p className="no-posts" style={{textAlign:'center', fontSize:18, color:'#555', gridColumn:'1 / -1'}}>No posts found. Create one!</p>) : (
            filtered.map((post) => {
              const postDate = new Date(post.createdAt).toLocaleDateString();
              const tempDiv = document.createElement('div'); tempDiv.innerHTML = post.content; const textContent = tempDiv.textContent || tempDiv.innerText || ''; const snippet = textContent.substring(0,120) + (textContent.length > 120 ? '...' : '');
              const isOwner = currentUser && post.author && (currentUser.name === post.author.username || currentUser.name === post.author.fullName);
              return (
                <div key={post._id} className="post-card" style={{background:'linear-gradient(135deg,#ff9a9e,#fad0c4)', borderRadius:16, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', padding:20, margin:'25px 0', width:'90%', maxWidth:750, transition:'transform .2s ease-in-out'}}>
                  {post.image && <img src={post.image} alt="Post" style={{width:'100%', height:200, objectFit:'cover', borderRadius:8, marginBottom:15}} />}
                  <div className="post-content" style={{padding:20, display:'flex', flexDirection:'column'}}>
                    <h3 className="post-title" style={{fontSize:20, fontWeight:600, margin:'0 0 10px', color:'#333'}}>{post.title}</h3>
                    <p className="post-author" style={{fontSize:14, color:'#2575fc', marginBottom:8, fontWeight:500}}>by {post.author ? (post.author.username || post.author.fullName) : 'Unknown'}</p>
                    <p className="post-category" style={{fontSize:12, color:'#666', marginBottom:8, fontWeight:500, textTransform:'capitalize'}}>📂 {post.category && post.category.trim() !== '' ? (post.category.charAt(0).toUpperCase() + post.category.slice(1)) : 'Uncategorized'}</p>
                    <p className="post-snippet" style={{fontSize:14, color:'#666', marginBottom:12}}>{snippet}</p>
                    <div className="post-footer" style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:'#777', marginBottom:10}}>
                      <span>📅 {postDate}</span>
                      <span>❤️ {post.likes ? post.likes.length : 0} | 💬 {post.comments ? post.comments.length : 0}</span>
                    </div>
                    <div>
                      <button className="btn btn-view" style={{padding:'8px 16px', border:'none', borderRadius:50, cursor:'pointer', fontSize:14, fontWeight:600, marginRight:5, background:'linear-gradient(45deg,#ff6a00,#ee0979)', color:'#fff'}} onClick={()=>{ window.location.hash = `#/single-post?id=${post._id}`; }}>Read More</button>
                      <button className="btn btn-like" style={{padding:'8px 16px', border:'none', borderRadius:50, cursor:'pointer', fontSize:18, color:'#e63946', background:'transparent'}} onClick={()=>likePost(post._id)}>❤️ {post.likes ? post.likes.length : 0}</button>
                      {!isOwner && post.author && (
                        <button className="btn btn-follow" style={{padding:'8px 16px', border:'none', borderRadius:50, cursor:'pointer', fontSize:14, fontWeight:600, background:'linear-gradient(45deg,#4facfe,#00f2fe)', color:'#fff', marginLeft:5}} onClick={()=>followUser(post.author._id, post.author.username)}>👥 Follow</button>
                      )}
                      {isOwner && (
                        <button className="btn btn-delete" style={{padding:'8px 16px', border:'none', borderRadius:50, cursor:'pointer', fontSize:14, fontWeight:600, background:'linear-gradient(45deg,#ff416c,#ff4b2b)', color:'#fff'}} onClick={()=>deletePost(post._id)}>🗑 Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

function CreatePost() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageInfo, setImageInfo] = useState({ show: false, ok: false, text: '' });
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.name) { alert('Please login first!'); window.location.hash = '#/login'; return; }
    const draft = localStorage.getItem('postDraft');
    if (draft) { const d = JSON.parse(draft); setTitle(d.title || ''); setContent(d.content || ''); setCategory(d.category || ''); }
  }, []);

  function format(cmd, value = null) {
    document.execCommand(cmd, false, value);
    editorRef.current && editorRef.current.focus();
    setContent(editorRef.current?.innerHTML || '');
  }

  function insertCodeBlock() {
    const codeBlock = '<pre><code>// Enter your code here\n</code></pre>';
    document.execCommand('insertHTML', false, codeBlock);
    editorRef.current && editorRef.current.focus();
    setContent(editorRef.current?.innerHTML || '');
  }

  function insertTable() {
    const table = `
      <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Header 1</th>
          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Header 2</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">Cell 1</td>
          <td style="border: 1px solid #ddd; padding: 8px;">Cell 2</td>
        </tr>
      </table>
    `;
    document.execCommand('insertHTML', false, table);
    editorRef.current && editorRef.current.focus();
    setContent(editorRef.current?.innerHTML || '');
  }

  function checkFileSize(input) {
    const file = input.target?.files?.[0];
    setImageFile(file || null);
    if (!file) { setImageInfo({ show:false, ok:false, text:'' }); return; }
    const sizeInMB = (file.size / (1024*1024)).toFixed(2);
    const maxSize = 5;
    if (file.size > maxSize * 1024 * 1024) {
      setImageInfo({ show:true, ok:false, text:`⚠️ File too large (${sizeInMB}MB). Max size is ${maxSize}MB.` });
      input.target.value = '';
    } else {
      setImageInfo({ show:true, ok:true, text:`✅ File uploaded: ${file.name} (${sizeInMB}MB)` });
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      const payload = { title, content, category, tags };
      if (title || content || category || tags) localStorage.setItem('postDraft', JSON.stringify(payload));
    }, 2000);
    return () => clearTimeout(t);
  }, [title, content, category, tags]);

  function compressImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = function() {
        const maxSize = 800; let { width, height } = img;
        if (width > height) { if (width > maxSize) { height = (height*maxSize)/width; width = maxSize; } }
        else { if (height > maxSize) { width = (width*maxSize)/height; height = maxSize; } }
        canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function savePost(e) {
    e.preventDefault();
    if (!title || !content || !category) { alert('Please fill in all required fields!'); return; }
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.name) { alert('Please login first!'); window.location.hash = '#/login'; return; }
    setPublishing(true);
    try {
      let imageData = null;
      if (imageFile) {
        const maxSize = 5*1024*1024; if (imageFile.size > maxSize) { alert('Image file is too large!'); setPublishing(false); return; }
        const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp']; if (!allowed.includes(imageFile.type)) { alert('Please select a valid image file.'); setPublishing(false); return; }
        imageData = await compressImage(imageFile);
      }
      
      // Process tags
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const postData = { 
        title, 
        content, 
        category, 
        tags: tagsArray,
        image: imageData, 
        authorUsername: currentUser.name 
      };
      const response = await fetch('/api/posts', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(postData) });
      const result = await response.json();
      if (response.ok) {
        alert('Post created successfully!');
        localStorage.removeItem('postDraft');
        window.location.hash = '#/dashboard';
      } else { throw new Error(result.error || 'Unknown error'); }
    } catch (err) {
      console.error('Error:', err); alert('Error creating post. Please try again.');
    } finally { setPublishing(false); }
  }

  return (
    <div style={styles.pageBg}>
      <Navbar />
      <div className="main-container" style={{position:'relative', zIndex:10, padding:'40px 20px', maxWidth:900, margin:'0 auto'}}>
        <div className="create-header" style={{textAlign:'center', marginBottom:40, color:'#fff'}}>
          <h1 style={{fontSize:'3.5rem', fontWeight:700, marginBottom:15, background:'linear-gradient(135deg,#ff7eb3,#ff758c,#a1c4fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', textShadow:'0 4px 8px rgba(0,0,0,0.3)'}}>✨ Create Magic</h1>
          <p style={{fontSize:'1.2rem', opacity:.9, maxWidth:600, margin:'0 auto', lineHeight:1.6}}>Share your thoughts, experiences, and creativity with the world.</p>
        </div>
        <div className="form-container" style={{background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', borderRadius:25, padding:40, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', border:'1px solid rgba(255,255,255,0.3)'}}>
          <form onSubmit={savePost}>
            <div className="form-group" style={{marginBottom:25}}>
              <label style={{display:'block', marginBottom:8, fontWeight:600, color:'#333', fontSize:'.95rem', textTransform:'uppercase', letterSpacing:.5}}>📝 Post Title</label>
              <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Give your post an amazing title..." className="form-control" style={createStyles.input} required />
            </div>
            <div className="form-group category-select" style={{marginBottom:25}}>
              <label style={createStyles.label}>🏷️ Category</label>
              <select value={category} onChange={(e)=>setCategory(e.target.value)} className="form-control" style={createStyles.input} required>
                <option value="">Choose a category for your post</option>
                <option value="technology">💻 Technology</option>
                <option value="lifestyle">🌟 Lifestyle</option>
                <option value="travel">✈️ Travel</option>
                <option value="food">🍳 Food & Cooking</option>
                <option value="health">💪 Health & Fitness</option>
                <option value="business">💼 Business</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="education">📚 Education</option>
              </select>
            </div>
            <div className="form-group" style={{marginBottom:25}}>
              <label style={createStyles.label}>🏷️ Tags</label>
              <input value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="Enter tags separated by commas (e.g., react, javascript, tutorial)" className="form-control" style={createStyles.input} />
              <small style={{color:'#666', fontSize:'.8rem', marginTop:5, display:'block'}}>Tags help others discover your post</small>
            </div>
            <div className="form-group" style={{marginBottom:25}}>
              <label style={createStyles.label}>🖼️ Featured Image</label>
              <div className="file-upload" style={{position:'relative', display:'inline-block', width:'100%'}}>
                <input id="featuredImage" type="file" accept="image/*" onChange={checkFileSize} style={{position:'absolute', left:-9999}} />
                <label htmlFor="featuredImage" className="file-upload-label" style={{display:'block', padding:20, border:'2px dashed #ff7eb3', borderRadius:15, textAlign:'center', cursor:'pointer', background:'rgba(255,126,179,0.05)', color:'#ff7eb3', fontWeight:500}}>📁 Click to upload an image (Max: 5MB)</label>
              </div>
              {imageInfo.show && (
                <div className={`file-info ${imageInfo.ok?'success':'error'}`} style={{marginTop:10, padding:'10px 15px', borderRadius:10, fontSize:'.9rem', fontWeight:500, background: imageInfo.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)', color: imageInfo.ok?'#16a34a':'#dc2626', border: `1px solid ${imageInfo.ok?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`}}>{imageInfo.text}</div>
              )}
            </div>
            <div className="form-group" style={{marginBottom:25}}>
              <label style={createStyles.label}>✍️ Content Editor</label>
              <div className="toolbar" style={{display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', padding:10, background:'#f8f9fa', borderRadius:8, border:'1px solid #e9ecef'}}>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('bold')} title="Bold"><b>B</b></button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('italic')} title="Italic"><i>I</i></button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('underline')} title="Underline"><u>U</u></button>
                <div style={{width:1, height:30, background:'#dee2e6', margin:'0 5px'}}></div>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('formatBlock','h1')} title="Heading 1">H1</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('formatBlock','h2')} title="Heading 2">H2</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('formatBlock','h3')} title="Heading 3">H3</button>
                <div style={{width:1, height:30, background:'#dee2e6', margin:'0 5px'}}></div>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('insertOrderedList')} title="Numbered List">1.</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('insertUnorderedList')} title="Bullet List">•</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('formatBlock','blockquote')} title="Quote">❝</button>
                <div style={{width:1, height:30, background:'#dee2e6', margin:'0 5px'}}></div>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={insertCodeBlock} title="Code Block">{'</>'}</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={insertTable} title="Insert Table">⊞</button>
                <div style={{width:1, height:30, background:'#dee2e6', margin:'0 5px'}}></div>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('justifyLeft')} title="Align Left">⫷</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('justifyCenter')} title="Align Center">⫸</button>
                <button type="button" className="toolbar-btn" style={createStyles.toolbarBtn} onClick={()=>format('justifyRight')} title="Align Right">⫹</button>
              </div>
              <div className="editor-container" style={{position:'relative', marginBottom:30}}>
                <div ref={editorRef} id="editor" contentEditable className="form-control" style={{width:'100%', minHeight:250, border:'2px solid #e1e5e9', borderRadius:15, padding:20, fontSize:16, lineHeight:1.6, background:'rgba(255,255,255,0.9)'}} onInput={(e)=>setContent(e.currentTarget.innerHTML)}></div>
              </div>
            </div>
            <div className="submit-section" style={{textAlign:'center', marginTop:40}}>
              <button type="submit" className={`submit-btn${publishing?' loading':''}`} style={{padding:'18px 40px', fontSize:'1.1rem', fontWeight:600, background:'linear-gradient(135deg,#ff7eb3,#ff758c)', border:'none', borderRadius:25, color:'#fff', cursor:'pointer', boxShadow:'0 8px 25px rgba(255,126,179,0.4)'}} disabled={publishing}>{publishing?'Publishing...':'🚀 Publish Post'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const createStyles = {
  input: { width:'100%', padding:'15px 20px', border:'2px solid #e1e5e9', borderRadius:15, fontSize:16, background:'rgba(255,255,255,0.9)' },
  label: { display:'block', marginBottom:8, fontWeight:600, color:'#333', fontSize:'.95rem', textTransform:'uppercase', letterSpacing:.5 },
  toolbarBtn: { padding:'10px 15px', border:'none', borderRadius:12, background:'linear-gradient(135deg,#f3f4f6,#e5e7eb)', color:'#374151', cursor:'pointer', fontWeight:600, fontSize:'.9rem', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }
};

function SinglePost() {
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const params = useMemo(() => new URLSearchParams((window.location.hash.split('?')[1]) || ''), []);
  const postId = params.get('id');

  useEffect(() => { if (postId) fetchPost(); }, [postId]);

  async function fetchPost() {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) throw new Error('Post not found');
      const data = await response.json();
      setPost(data);
      
      // Increment view count
      fetch(`/api/posts/${postId}/view`, { method: 'POST' });
      
      // Fetch recommendations
      fetchRecommendations();
    } catch (e) {
      console.error('Error fetching post:', e);
    }
  }

  async function fetchRecommendations() {
    try {
      const response = await fetch(`/api/posts/${postId}/recommendations`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (e) {
      console.error('Error fetching recommendations:', e);
    }
  }

  function sharePost(platform) {
    const url = window.location.href;
    const title = post?.title || '';
    const text = post?.content?.replace(/<[^>]*>/g, '').substring(0, 200) || '';
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      // Increment share count
      fetch(`/api/posts/${postId}/share`, { method: 'POST' });
    }
  }

  async function likePost() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!currentUser || !currentUser.name) { alert('Please login to like posts'); return; }
      const response = await fetch(`/api/posts/${postId}/like`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ authorUsername: currentUser.name }) });
      if (response.ok) { const updated = await response.json(); setPost(updated); } else { const err = await response.json(); alert('Error liking post: ' + (err.error || 'Unknown error')); }
    } catch (e) { console.error('Error liking post:', e); alert('Error liking post. Please try again.'); }
  }

  async function addComment() {
    const text = commentText.trim(); if (!text) { alert('Please enter a comment'); return; }
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.name) { alert('Please login to comment'); return; }
    try {
      const response = await fetch(`/api/posts/${postId}/comment`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ content: text, authorUsername: currentUser.name }) });
      if (response.ok) { const updated = await response.json(); setPost(updated); setCommentText(''); }
      else { const err = await response.json(); alert('Error adding comment: ' + (err.error || 'Unknown error')); }
    } catch (e) { console.error('Error adding comment:', e); alert('Error adding comment. Please try again.'); }
  }

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('currentUser')), []);
  const isLiked = useMemo(() => {
    if (!post || !currentUser) return false;
    return post.likes && post.likes.some(like => (typeof like === 'string' && like === currentUser.name) || (like && like.username === currentUser.name));
  }, [post, currentUser]);

  return (
    <div style={{background: "url('bg4.avif') no-repeat center center fixed", backgroundSize:'cover', minHeight:'100vh', position:'relative'}}>
      <Navbar />
      <div className="max-w-3xl" style={{maxWidth:960, margin:'0 auto', padding:'40px 20px', position:'relative', zIndex:1}}>
        <div id="postContainer" style={{background:'#fff', padding:24, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          {!post ? (
            <p style={{color:'#ef4444'}}>Post not found!</p>
          ) : (
            <div>
              <h1 style={{fontSize:28, fontWeight:700, marginBottom:8}}>{post.title}</h1>
              <p style={{color:'#4b5563', marginBottom:16}}>by <span style={{fontWeight:500, color:'#2563eb'}}>{post.author ? post.author.username : 'Unknown'}</span> • {new Date(post.createdAt).toLocaleDateString()}</p>
              {post.image && <img src={post.image} alt="Post" style={{width:'100%', height:256, objectFit:'cover', borderRadius:8, marginBottom:16}} />}
              <div style={{color:'#374151', marginBottom:16}} dangerouslySetInnerHTML={{__html: post.content}} />
              <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:16, flexWrap:'wrap'}}>
                <button onClick={likePost} className={`like-button ${isLiked?'liked':''}`} style={{fontSize:24, transition:'all .3s ease', color: isLiked?'#ef4444':'inherit'}}>
                  {isLiked ? '❤️' : '🤍'} <span>{post.likes ? post.likes.length : 0}</span>
                </button>
                <span style={{color:'#4b5563'}}>💬 {post.comments ? post.comments.length : 0} comments</span>
                <span style={{color:'#4b5563'}}>👁️ {post.viewCount || 0} views</span>
                <span style={{color:'#4b5563'}}>📤 {post.shareCount || 0} shares</span>
              </div>
              
              {/* Social Sharing Buttons */}
              <div style={{marginBottom:20, padding:15, background:'#f8f9fa', borderRadius:8, border:'1px solid #e9ecef'}}>
                <h4 style={{margin:'0 0 10px 0', fontSize:'1rem', color:'#495057'}}>Share this post:</h4>
                <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                  <button onClick={()=>sharePost('twitter')} style={{padding:'8px 16px', background:'#1da1f2', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, fontWeight:500}}>
                    🐦 Twitter
                  </button>
                  <button onClick={()=>sharePost('facebook')} style={{padding:'8px 16px', background:'#4267b2', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, fontWeight:500}}>
                    📘 Facebook
                  </button>
                  <button onClick={()=>sharePost('linkedin')} style={{padding:'8px 16px', background:'#0077b5', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, fontWeight:500}}>
                    💼 LinkedIn
                  </button>
                </div>
              </div>
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{marginBottom:20}}>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                    {post.tags.map((tag, idx) => (
                      <span key={idx} style={{padding:'4px 12px', background:'#e3f2fd', color:'#1976d2', borderRadius:20, fontSize:12, fontWeight:500}}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{background:'#fff', padding:24, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.1)', marginTop:24}}>
          <h3 style={{fontSize:20, fontWeight:700, marginBottom:16}}>Comments</h3>
          <div id="commentsList" style={{display:'flex', flexDirection:'column', gap:12, marginBottom:16}}>
            {!post || !post.comments || post.comments.length===0 ? (
              <p style={{color:'#6b7280'}}>No comments yet. Be the first to comment!</p>
            ) : (
              post.comments.map((c, idx) => (
                <div key={idx} style={{padding:12, background:'#f3f4f6', borderRadius:8}}>
                  <div style={{fontWeight:500, color:'#2563eb'}}>{c.author ? c.author.username : 'Unknown'}</div>
                  <div style={{color:'#374151'}}>{c.content}</div>
                  <div style={{fontSize:12, color:'#6b7280', marginTop:4}}>{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
          <textarea rows={3} value={commentText} onChange={(e)=>setCommentText(e.target.value)} style={{width:'100%', border:'1px solid #e5e7eb', padding:8, borderRadius:6, marginBottom:8}} placeholder="Write a comment..."></textarea>
          <button onClick={addComment} style={{background:'#22c55e', color:'#fff', padding:'8px 16px', borderRadius:6, border:'none', cursor:'pointer'}}>Post Comment</button>
        </div>
        
        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div style={{background:'#fff', padding:24, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.1)', marginTop:24}}>
            <h3 style={{fontSize:20, fontWeight:700, marginBottom:16}}>💡 You might also like</h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16}}>
              {recommendations.map((rec) => (
                <div key={rec._id} style={{padding:16, border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}} onClick={() => window.location.hash = `#/single-post?id=${rec._id}`}>
                  <h4 style={{fontSize:16, fontWeight:600, marginBottom:8, color:'#1f2937'}}>{rec.title}</h4>
                  <p style={{fontSize:14, color:'#6b7280', marginBottom:8}}>by {rec.author?.username || 'Unknown'}</p>
                  <p style={{fontSize:12, color:'#9ca3af'}}>{new Date(rec.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Categories() {
  const baseCategories = useMemo(() => ([
    { id:'technology', title:'Technology', icon:'💻', description:'Latest tech trends, programming tutorials, and digital innovations that shape our future.', posts:0, authors:0 },
    { id:'lifestyle', title:'Lifestyle', icon:'🌟', description:'Personal development, wellness tips, and life hacks to improve your daily routine.', posts:0, authors:0 },
    { id:'travel', title:'Travel', icon:'✈️', description:'Adventure stories, travel guides, and breathtaking destinations around the world.', posts:0, authors:0 },
    { id:'food', title:'Food & Cooking', icon:'🍳', description:'Delicious recipes, cooking tips, and culinary adventures for food enthusiasts.', posts:0, authors:0 },
    { id:'health', title:'Health & Fitness', icon:'💪', description:'Fitness tips, nutrition advice, and wellness strategies for a healthier life.', posts:0, authors:0 },
    { id:'business', title:'Business', icon:'💼', description:'Entrepreneurship insights, career advice, and business strategies for success.', posts:0, authors:0 },
    { id:'entertainment', title:'Entertainment', icon:'🎬', description:'Movie reviews, music recommendations, and pop culture discussions.', posts:0, authors:0 },
    { id:'education', title:'Education', icon:'📚', description:'Learning resources, study tips, and educational content for continuous growth.', posts:0, authors:0 }
  ]), []);
  const [categories, setCategories] = useState(baseCategories);
  const [featuredPosts, setFeaturedPosts] = useState([]);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.name) { alert('Please login first!'); window.location.hash = '#/login'; return; }
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch('http://localhost:5000/api/posts');
      const posts = await response.json();
      if (!response.ok) throw new Error('Failed to fetch posts');
      const categoryStats = {};
      posts.forEach(post => {
        if (post.category) {
          categoryStats[post.category] = categoryStats[post.category] || { posts:0, authors: new Set() };
          categoryStats[post.category].posts++;
          if (post.author && post.author.username) categoryStats[post.category].authors.add(post.author.username);
          else if (post.author && post.author.fullName) categoryStats[post.category].authors.add(post.author.fullName);
        }
      });
      setCategories((prev) => prev.map(cat => {
        const stats = categoryStats[cat.id];
        return stats ? { ...cat, posts: stats.posts, authors: stats.authors.size } : cat;
      }));
      const featured = posts.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3).map(p=>({ title:p.title, author: p.author ? (p.author.username || p.author.fullName) : 'Unknown', snippet: (p.content||'').replace(/<[^>]*>/g,'').substring(0,100)+'...' }));
      setFeaturedPosts(featured);
    } catch (e) { console.error('Error fetching category stats:', e); }
  }

  function filterPostsByCategory(categoryId) {
    localStorage.setItem('selectedCategory', categoryId);
    window.location.hash = '#/dashboard';
  }

  return (
    <div style={styles.pageBg}>
      <Navbar />
      <div className="header" style={{textAlign:'center', padding:'60px 20px 40px', color:'#fff'}}>
        <h1 style={{fontSize:'3rem', fontWeight:700, marginBottom:10, textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>📚 Explore Categories</h1>
        <p style={{fontSize:'1.2rem', opacity:.9, maxWidth:600, margin:'0 auto'}}>Discover amazing content across different topics and interests.</p>
      </div>
      <div className="categories-container" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:30, padding:'0 40px 50px', maxWidth:1400, margin:'0 auto'}}>
        {categories.map((cat) => (
          <div key={cat.id} className="category-card" onClick={()=>filterPostsByCategory(cat.id)} style={{background:'linear-gradient(135deg,#ff9a9e,#fad0c4)', borderRadius:20, padding:30, textAlign:'center', cursor:'pointer', overflow:'hidden'}}>
            <span className="category-icon" style={{fontSize:'4rem', marginBottom:20, display:'block'}}>{cat.icon}</span>
            <h3 className="category-title" style={{fontSize:'1.8rem', fontWeight:700, color:'#333', marginBottom:15}}>{cat.title}</h3>
            <p className="category-description" style={{color:'#666', fontSize:'1rem', lineHeight:1.6, marginBottom:25}}>{cat.description}</p>
            <div className="category-stats" style={{display:'flex', justifyContent:'space-around', marginBottom:25, color:'#777', fontSize:'.9rem'}}>
              <div className="stat" style={{textAlign:'center'}}>
                <span className="stat-number" style={{fontSize:'1.5rem', fontWeight:700, color:'#e63946', display:'block'}}>{cat.posts}</span>
                <span>Posts</span>
              </div>
              <div className="stat" style={{textAlign:'center'}}>
                <span className="stat-number" style={{fontSize:'1.5rem', fontWeight:700, color:'#e63946', display:'block'}}>{cat.authors}</span>
                <span>Authors</span>
              </div>
            </div>
            <button className="explore-btn" style={{background:'linear-gradient(135deg,#ff7eb3,#ff758c)', color:'#fff', border:'none', padding:'12px 30px', borderRadius:25, fontSize:'1rem', fontWeight:600, cursor:'pointer'}}>Explore {cat.title}</button>
          </div>
        ))}
      </div>
      <div className="featured-section" style={{marginTop:60, padding:'0 40px'}}>
        <h2 className="section-title" style={{textAlign:'center', color:'#fff', fontSize:'2.5rem', fontWeight:700, marginBottom:40, textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>🔥 Featured Posts</h2>
        <div className="featured-posts" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:25, marginBottom:50}}>
          {featuredPosts.length===0 ? (
            <div style={{textAlign:'center', color:'rgba(255,255,255,0.7)', padding:20}}>No posts available yet. Create the first post!</div>
          ) : featuredPosts.map((p, idx) => (
            <div key={idx} className="featured-card" style={{background:'rgba(255,255,255,0.1)', backdropFilter:'blur(15px)', borderRadius:16, padding:20, border:'1px solid rgba(255,255,255,0.2)'}}>
              <h4 className="featured-title" style={{fontSize:'1.2rem', fontWeight:600, color:'#fff', marginBottom:10}}>{p.title}</h4>
              <p className="featured-author" style={{fontSize:'.9rem', color:'rgba(255,255,255,0.8)', marginBottom:10}}>by {p.author}</p>
              <p className="featured-snippet" style={{fontSize:'.9rem', color:'rgba(255,255,255,0.7)', lineHeight:1.5}}>{p.snippet}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const onSubmit = async (e) => {
    e.preventDefault();
      const response = await fetch('/api/admin/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const result = await response.json();
    alert(result.message);
    if (response.ok && result.token) {
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('isAdminLoggedIn', 'true');
      window.location.hash = '#/admin';
    }
  };
  return (
    <div style={{minHeight:'100vh', padding:20, background: 'linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100%)', backgroundSize:'400% 400%', animation:'gradientShift 15s ease infinite', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      <div style={{maxWidth:480, width:'100%', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(30px)', borderRadius:24, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)', padding:48, border:'1px solid rgba(255,255,255,0.3)'}}>
        <div style={{textAlign:'center', marginBottom:32}}>
          <div style={{width:80, height:80, background:'linear-gradient(135deg,#667eea,#764ba2)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', color:'#fff', fontSize:32, boxShadow:'0 8px 25px rgba(102,126,234,0.3)'}}>🛡️</div>
          <h1 style={{color:'#1a202c', fontSize:32, fontWeight:700, marginBottom:12, background:'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>Admin Login</h1>
          <p style={{color:'#718096'}}>Manage users and posts securely</p>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <div style={{marginBottom:20}}>
            <label style={{display:'block', marginBottom:10, color:'#2d3748', fontWeight:600, fontSize:15}}>Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@blog.com" style={signupStyles.input} required />
          </div>
          <div style={{marginBottom:8}}>
            <label style={{display:'block', marginBottom:10, color:'#2d3748', fontWeight:600, fontSize:15}}>Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" style={signupStyles.input} required />
          </div>
          <button type="submit" style={signupStyles.submit}>Sign In</button>
          <div style={{textAlign:'center', marginTop:18}}>
            <a href="#/dashboard" style={{color:'#667eea', textDecoration:'none', fontWeight:600}}>Back to app</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [userFilter, setUserFilter] = useState('');
  const [postFilter, setPostFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState({ usersCount: 0, postsCount: 0, flagged: 0 });
  const [section, setSection] = useState('users');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { window.location.hash = '#/admin-login'; return; }
    loadSummary();
    loadUsers();
    loadPosts();
  }, []);

  async function loadSummary() {
    const token = localStorage.getItem('adminToken');
    const res = await fetch('/api/admin/manage/summary', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setSummary(data); }
  }

  async function loadUsers() {
    const token = localStorage.getItem('adminToken');
    const res = await fetch('/api/admin/manage/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setUsers(data); }
  }

  async function loadPosts() {
    const token = localStorage.getItem('adminToken');
    const res = await fetch('/api/admin/manage/posts', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setPosts(data); }
  }

  async function deleteUser(id) {
    if (!confirm('Delete user?')) return;
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/admin/manage/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
    loadSummary();
  }

  async function deletePost(id) {
    if (!confirm('Delete post?')) return;
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/admin/manage/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadPosts();
    loadSummary();
  }

  async function togglePublish(id, isPublished) {
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/admin/manage/posts/${id}/publish`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ isPublished }) });
    loadPosts();
  }

  function logout() { localStorage.removeItem('isAdminLoggedIn'); localStorage.removeItem('adminToken'); window.location.hash = '#/admin-login'; }

  const filteredUsers = users.filter(u => (u.username||'').toLowerCase().includes(userFilter.toLowerCase()) || (u.email||'').toLowerCase().includes(userFilter.toLowerCase()));
  const filteredPosts = posts.filter(p => (p.title||'').toLowerCase().includes(postFilter.toLowerCase()) || ((p.author?.username)||'').toLowerCase().includes(postFilter.toLowerCase()));

  return (
    <div style={{minHeight:'100vh', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100%)', backgroundSize:'400% 400%', animation:'gradientShift 15s ease infinite'}}>
      <div className="d-flex" style={{display:'flex'}}>
        <div className="sidebar" style={{width:220, minHeight:'100vh', background:'rgba(31,42,68,0.9)', color:'#f0f3f9', position:'fixed', padding:'1rem 0', backdropFilter:'blur(12px)'}}>
          <div style={{textAlign:'center', marginBottom:16}}>
            <h4 style={{margin:0}}>Admin Panel</h4>
            <small>BlogVerse</small>
          </div>
          <a href="#" className="active" style={{color:'#cfd8e7', textDecoration:'none', display:'block', padding:'.75rem 1.25rem', margin:'4px 0', borderRadius:12, background:'linear-gradient(135deg,#667eea,#764ba2)'}}>Overview</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); setSection('users'); }} style={{color:'#cfd8e7', textDecoration:'none', display:'block', padding:'.75rem 1.25rem', margin:'4px 0', borderRadius:6}}>Users</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); setSection('posts'); }} style={{color:'#cfd8e7', textDecoration:'none', display:'block', padding:'.75rem 1.25rem', margin:'4px 0', borderRadius:6}}>Posts</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); logout();}} style={{color:'#cfd8e7', textDecoration:'none', display:'block', padding:'.75rem 1.25rem', margin:'4px 0', borderRadius:6}}>Logout</a>
        </div>
        <div className="main" style={{marginLeft:240, padding:30, flexGrow:1}}>
          <div className="d-flex justify-content-between align-items-center mb-4" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
            <div>
              <h2 style={{color:'#fff', textShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>Welcome, Admin</h2>
              <p style={{color:'rgba(255,255,255,0.8)'}}>Overview of platform activity</p>
            </div>
          </div>
          <div className="row g-3" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12}}>
            <div className="card card-summary p-3" style={{borderRadius:16, padding:16, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', boxShadow:'0 10px 30px rgba(0,0,0,0.15)'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div><h6 style={{textTransform:'uppercase'}}>Total Users</h6><h3 id="adminTotalUsers">{summary.usersCount}</h3></div>
                <div style={{fontSize:'2rem'}}>👥</div>
              </div>
              <small style={{color:'#6c757d'}}>Registered on platform</small>
            </div>
            <div className="card card-summary p-3" style={{borderRadius:16, padding:16, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', boxShadow:'0 10px 30px rgba(0,0,0,0.15)'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div><h6 style={{textTransform:'uppercase'}}>Total Posts</h6><h3 id="adminTotalPosts">{summary.postsCount}</h3></div>
                <div style={{fontSize:'2rem'}}>✍️</div>
              </div>
              <small style={{color:'#6c757d'}}>All posts by users</small>
            </div>
            <div className="card card-summary p-3" style={{borderRadius:16, padding:16, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', boxShadow:'0 10px 30px rgba(0,0,0,0.15)'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div><h6 style={{textTransform:'uppercase'}}>Flagged / Pending</h6><h3 id="adminFlagged">{summary.flagged}</h3></div>
                <div style={{fontSize:'2rem'}}>⚠️</div>
              </div>
              <small style={{color:'#6c757d'}}>Needs review</small>
            </div>
          </div>

          {section === 'users' && (
            <div id="usersSection" className="table-wrapper mt-5" style={{marginTop:20}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h4>Users</h4>
                <input value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} placeholder="Search users..." className="form-control form-control-sm w-25" style={{width:240, padding:8, border:'1px solid #ced4da', borderRadius:6}} />
              </div>
              <div className="table-responsive" style={{overflowX:'auto'}}>
                <table className="table table-hover align-middle" style={{width:'100%', background:'rgba(255,255,255,0.98)', borderRadius:12, overflow:'hidden'}}>
                  <thead className="table-light" style={{background:'#f8f9fa'}}>
                    <tr><th>#</th><th>Username / Email</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody id="usersTableBody">
                    {filteredUsers.map((u,i)=> (
                      <tr key={u._id}>
                        <td>{i+1}</td>
                        <td>{u.username} <br/><small>{u.email}</small></td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td><button className="btn btn-sm btn-danger" onClick={()=>deleteUser(u._id)} style={{padding:'8px 12px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#ff416c,#ff4b2b)', color:'#fff', cursor:'pointer'}}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'posts' && (
            <div id="postsSection" className="table-wrapper mt-5" style={{marginTop:20}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h4>Posts</h4>
                <input value={postFilter} onChange={(e)=>setPostFilter(e.target.value)} placeholder="Search posts..." className="form-control form-control-sm w-25" style={{width:240, padding:8, border:'1px solid #ced4da', borderRadius:6}} />
              </div>
              <div className="table-responsive" style={{overflowX:'auto'}}>
                <table className="table table-hover align-middle" style={{width:'100%', background:'rgba(255,255,255,0.98)', borderRadius:12, overflow:'hidden'}}>
                  <thead className="table-light" style={{background:'#f8f9fa'}}>
                    <tr><th>#</th><th>Title</th><th>Author</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody id="postsTableBody">
                    {filteredPosts.map((p,i)=> (
                      <tr key={p._id}>
                        <td>{i+1}</td>
                        <td>{p.title}</td>
                        <td>{p.author?.username || '-'}</td>
                        <td>{p.isPublished ? 'published' : 'draft'}</td>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={()=>togglePublish(p._id, !p.isPublished)} style={{padding:'8px 12px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#8EC5FC,#E0C3FC)', color:'#1f2937', cursor:'pointer', marginRight:6}}>{p.isPublished ? 'Unpublish' : 'Publish'}</button>
                          <button className="btn btn-sm btn-danger" onClick={()=>deletePost(p._id)} style={{padding:'8px 12px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#ff416c,#ff4b2b)', color:'#fff', cursor:'pointer'}}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [alert, setAlert] = useState({ message: "", type: "", visible: false });
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const showAlert = (message, type) => {
    setAlert({ message, type, visible: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      showAlert("Please fill in all fields", "danger");
      return;
    }
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password })
      });
      const result = await response.json();
      if (response.ok) {
        window.localStorage.setItem("currentUser", JSON.stringify({
          name: result.user.username,
          email: result.user.email
        }));
        showAlert(result.message || "Logged in", "success");
        setTimeout(() => { window.location.hash = "#/dashboard"; }, 800);
      } else {
        showAlert(result.message || "Login failed", "danger");
      }
    } catch {
      showAlert("Server error. Please try again later.", "danger");
    }
  };

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background: 'linear-gradient(45deg,#ff6b6b 0%,#4ecdc4 20%,#45b7d1 40%,#96ceb4 60%,#feca57 80%,#ff9ff3 100%)', backgroundSize: '300% 300%', animation: 'gradientMove 12s ease infinite' }}>
      <style>{`@keyframes gradientMove {0%{background-position:0% 50%}25%{background-position:100% 50%}50%{background-position:100% 100%}75%{background-position:0% 100%}100%{background-position:0% 50%}}`}</style>
      <div style={{background:'rgba(255,255,255,0.95)', backdropFilter:'blur(30px)', borderRadius:24, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)', padding:48, width:'100%', maxWidth:450, border:'1px solid rgba(255,255,255,0.3)'}}>
        <div style={{textAlign:'center', marginBottom:36}}>
          <div style={{width:80, height:80, background:'linear-gradient(135deg,#667eea,#764ba2)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', color:'#fff', fontSize:32, boxShadow:'0 8px 25px rgba(102,126,234,0.3)'}}>📝</div>
          <h1 style={{fontSize:32, fontWeight:700, marginBottom:12, background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>Welcome Back</h1>
          <p style={{color:'#718096'}}>Sign in to continue your journey</p>
        </div>
        {alert.visible && (
          <div style={{borderRadius:16, padding:'18px 22px', marginBottom:28, fontWeight:500, backdropFilter:'blur(10px)', background: alert.type==='success' ? 'rgba(209,250,229,0.9)' : 'rgba(254,226,226,0.9)', color: alert.type==='success' ? '#065f46' : '#991b1b', borderLeft: `4px solid ${alert.type==='success' ? '#10b981' : '#ef4444'}`}}>{alert.message}</div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div style={{marginBottom:28, position:'relative'}}>
            <span style={{position:'absolute', left:22, top:'50%', transform:'translateY(-50%)', color:'#667eea', fontSize:18, zIndex:3}}>👤</span>
            <input value={emailOrUsername} onChange={(e)=>setEmailOrUsername(e.target.value)} placeholder="Email or Username" required style={{width:'100%', padding:'18px 22px 18px 60px', border:'2px solid #e2e8f0', borderRadius:16, fontSize:16, fontWeight:500, color:'#1a202c', background:'rgba(248,250,252,0.8)'}} />
          </div>
          <div style={{marginBottom:12, position:'relative'}}>
            <span style={{position:'absolute', left:22, top:'50%', transform:'translateY(-50%)', color:'#667eea', fontSize:18, zIndex:3}}>🔒</span>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" required style={{width:'100%', padding:'18px 22px 18px 60px', border:'2px solid #e2e8f0', borderRadius:16, fontSize:16, fontWeight:500, color:'#1a202c', background:'rgba(248,250,252,0.8)'}} />
          </div>
          <div style={{textAlign:'center', margin:'20px 0'}}>
            <a href="#/forgot" style={{color:'#667eea', textDecoration:'none', fontWeight:500, fontSize:14}}>Forgot your password?</a>
          </div>
          <button type="submit" style={{width:'100%', padding:20, background:'linear-gradient(135deg,#667eea 0%, #764ba2 100%)', border:'none', borderRadius:16, color:'#fff', fontSize:18, fontWeight:600, cursor:'pointer', boxShadow:'0 8px 25px rgba(102,126,234,0.3)'}}>Sign In</button>
        </form>
        <div style={{textAlign:'center', marginTop:28}}>
          <a href="#/signup" style={{color:'#667eea', textDecoration:'none', fontWeight:600}}>Don't have an account? <strong>Sign Up</strong></a>
        </div>
      </div>
    </div>
  );
}

function ForgotPassword() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(""); setLink("");
    if (!emailOrUsername) { setMessage("Enter email or username"); return; }
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername })
      });
      const data = await res.json();
      setMessage(data.message || "If the account exists, a reset link has been sent.");
      if (data.resetLink) {
        // For demo/dev: show the reset link and add a button to navigate
        setLink(data.resetLink);
      }
    } catch (e) {
      setMessage("Server error. Try again later.");
    }
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'linear-gradient(135deg,#a1c4fd,#c2e9fb)'}}>
      <div style={{background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:480, boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
        <h2 style={{marginTop:0, marginBottom:8}}>Forgot Password</h2>
        <p style={{marginTop:0, color:'#6b7280'}}>Enter your email or username to receive a reset link.</p>
        {message && (
          <div style={{margin:'12px 0', padding:'12px 16px', borderRadius:12, background:'rgba(59,130,246,0.1)', color:'#1d4ed8'}}>{message}</div>
        )}
        <form onSubmit={onSubmit}>
          <div style={{marginBottom:16}}>
            <input value={emailOrUsername} onChange={(e)=>setEmailOrUsername(e.target.value)} placeholder="Email or Username" style={{width:'100%', padding:'14px 18px', border:'2px solid #e5e7eb', borderRadius:12}} />
          </div>
          <button type="submit" style={{width:'100%', padding:14, border:'none', borderRadius:12, background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', fontWeight:600, cursor:'pointer'}}>Send Reset Link</button>
        </form>
        {link && (
          <div style={{marginTop:16}}>
            <div style={{fontSize:12, color:'#6b7280', marginBottom:6}}>Dev reset link:</div>
            <div style={{wordBreak:'break-all', background:'#f9fafb', border:'1px solid #e5e7eb', padding:10, borderRadius:8}}>{link}</div>
            <button onClick={()=>{ const token = (link.split('/').pop() || '').trim(); window.location.hash = `#/reset?token=${token}`; }} style={{marginTop:10, padding:'10px 16px', border:'none', borderRadius:10, background:'#10b981', color:'#fff', cursor:'pointer'}}>Open Reset Page</button>
          </div>
        )}
        <div style={{textAlign:'center', marginTop:16}}>
          <a href="#/login" style={{color:'#667eea', textDecoration:'none', fontWeight:600}}>Back to Login</a>
        </div>
      </div>
    </div>
  );
}

function ResetPassword() {
  const params = useMemo(() => new URLSearchParams((window.location.hash.split('?')[1]) || ''), []);
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMessage('');
    if (!newPassword || newPassword.length < 6) { setMessage('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setMessage('Passwords do not match'); return; }
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successfully. You can now login.');
        setTimeout(()=>{ window.location.hash = '#/login'; }, 800);
      } else {
        setMessage(data.message || 'Reset failed. Link may be expired.');
      }
    } catch (e) {
      setMessage('Server error. Try again later.');
    }
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'linear-gradient(135deg,#f6d365,#fda085)'}}>
      <div style={{background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:480, boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
        <h2 style={{marginTop:0, marginBottom:8}}>Reset Password</h2>
        <p style={{marginTop:0, color:'#6b7280'}}>Enter your new password below.</p>
        {message && (
          <div style={{margin:'12px 0', padding:'12px 16px', borderRadius:12, background:'rgba(16,185,129,0.1)', color:'#065f46'}}>{message}</div>
        )}
        <form onSubmit={onSubmit}>
          <div style={{marginBottom:12}}>
            <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="New Password" style={{width:'100%', padding:'14px 18px', border:'2px solid #e5e7eb', borderRadius:12}} />
          </div>
          <div style={{marginBottom:16}}>
            <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Confirm Password" style={{width:'100%', padding:'14px 18px', border:'2px solid #e5e7eb', borderRadius:12}} />
          </div>
          <button type="submit" style={{width:'100%', padding:14, border:'none', borderRadius:12, background:'linear-gradient(135deg,#ff7eb3,#ff758c)', color:'#fff', fontWeight:600, cursor:'pointer'}}>Update Password</button>
        </form>
        <div style={{textAlign:'center', marginTop:16}}>
          <a href="#/login" style={{color:'#667eea', textDecoration:'none', fontWeight:600}}>Back to Login</a>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const [route, setRoute] = useState(() => window.location.hash || '#/profile');
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/profile');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.startsWith('#/login')) return <Login />;
  if (route.startsWith('#/signup')) return <Signup />;
  if (route.startsWith('#/forgot')) return <ForgotPassword />;
  if (route.startsWith('#/reset')) return <ResetPassword />;
  if (route.startsWith('#/profile')) return <Profile />;
  if (route.startsWith('#/dashboard')) return <Dashboard />;
  if (route.startsWith('#/create-post')) return <CreatePost />;
  if (route.startsWith('#/single-post')) return <SinglePost />;
  if (route.startsWith('#/categories')) return <Categories />;
  if (route.startsWith('#/admin-login')) return <AdminLogin />;
  if (route.startsWith('#/admin')) return <AdminDashboard />;
  return <Profile />;
}

function App() {
  return <Router />;
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);


