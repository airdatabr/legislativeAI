# Changelog - Assistente Legislativo

## [2025-06-18] - Interface Redesign & Branding System

### ✨ New Features
- **Gemini-Style Interface**: Complete redesign following Google Gemini layout patterns
- **Organization Branding**: Parametrizable system for custom organization name, title, and logo
- **Logo Upload**: Drag-and-drop image upload with file validation and preview
- **Dynamic Branding API**: Public endpoint for real-time organization customization

### 🎨 UI/UX Improvements
- **Collapsible Sidebar**: Gray background with border line, minimum width when collapsed
- **Sidebar Navigation**: Vertical button layout with PenTool (nova conversa) and Clock (histórico) icons
- **Content Pushing**: Sidebar pushes main content instead of overlaying
- **Logo Enhancement**: Increased header logo size for better brand visibility
- **Clean Layout**: Removed duplicate buttons and organized interface elements

### 🔧 Technical Changes
- **File Upload System**: Multer integration for secure image handling
- **Static File Serving**: `/uploads` endpoint for uploaded assets
- **Environment Variables**: Added ORG_NAME, ORG_TITLE, ORG_LOGO_URL support
- **API Endpoints**: `/api/branding` for public access, `/api/admin/upload-logo` for uploads
- **Error Handling**: Comprehensive validation for file types and sizes

### 📁 Files Modified
- `client/src/components/chat/sidebar.tsx` - Complete sidebar redesign
- `client/src/components/chat/chat-area.tsx` - Dynamic branding integration
- `client/src/pages/admin.tsx` - Added branding configuration section
- `server/routes.ts` - Upload endpoints and branding API
- `replit.md` - Updated project documentation

### 🚀 Ready for Production
All changes have been tested and are ready for Git commit and deployment.