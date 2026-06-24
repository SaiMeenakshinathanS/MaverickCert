// LinkedIn Share Modal - Shows content ready for sharing
export function LinkedInShareModal({ isOpen, onClose, content, postText, trainingName, organization }) {
  const handleQuickShare = async () => {
    if (!postText) {
      alert('Please generate LinkedIn content first');
      return;
    }

    try {
      // Copy text to clipboard
      await navigator.clipboard.writeText(postText);

      // Wait a moment, then open LinkedIn
      setTimeout(() => {
        // Open LinkedIn in new window at compose
        const linkedinUrl = 'https://www.linkedin.com/feed/';
        const newWindow = window.open(linkedinUrl, 'linkedin_share', 'width=800,height=600');

        if (newWindow) {
          newWindow.focus();
        } else {
          alert('LinkedIn window blocked. Please disable pop-up blockers and try again.');
        }
      }, 300);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Could not copy text. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Share on LinkedIn</h2>
            <p className="text-sm text-slate-400">Your achievement, ready to post</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Preview Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Your Post</p>
              <p className="text-slate-400 text-xs">Ready to share</p>
            </div>
          </div>
          <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">{postText}</p>
          <div className="mt-4 pt-4 border-t border-slate-700 flex gap-3 text-slate-400 text-xs">
            <button className="hover:text-slate-300 transition-colors">👍 Like</button>
            <button className="hover:text-slate-300 transition-colors">💬 Comment</button>
            <button className="hover:text-slate-300 transition-colors">↗️ Share</button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-6">
          <p className="text-indigo-300 text-sm">
            <span className="font-semibold">📋 How it works:</span><br/>
            Click "1-Click Share" below. We'll copy your content and open LinkedIn. Simply paste (Ctrl+V or Cmd+V) in the compose field and hit Post!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{postText?.length || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Characters</p>
          </div>
          <div className="bg-surface-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">#️⃣</p>
            <p className="text-xs text-slate-500 mt-1">Hashtags</p>
          </div>
          <div className="bg-surface-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-400">📈</p>
            <p className="text-xs text-slate-500 mt-1">Engagement</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleQuickShare}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            🚀 1-Click Share to LinkedIn
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-surface-muted border border-surface-border text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 text-center mt-4">
          💡 Tip: You can edit the post after pasting on LinkedIn
        </p>
      </div>
    </div>
  );
}
