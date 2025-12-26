# 🧠 Second Brain – Your Digital Knowledge Hub

Second Brain is your personal knowledge management system designed to store, organize, and access your thoughts, ideas, and learning materials. With sleek, intuitive UI components and powerful search and organization features, Second Brain is the ultimate digital brain for managing your thoughts.

## 🔍 Features

### 🗂️ **Organized Structure**
- Easily organize and categorize user-provided links for efficient access.

### 🔎 **Quick data**
- Quickly find and display relevant data based on specific application links or categories.

### 🏷️ **Tagging Support**
- Tag your notes with keywords for better organization and filtering. Retrieve your notes effortlessly based on tags.

### 📆 **Date Stamping**
- Automatically capture timestamps for every note to track when it was created or updated.

### 📱 ** Responsive Design**
- A design optimized for a smooth experience across desktop devices, ensuring usability and clarity.

### 🧠 **Share Your Brain**
- Share your interests ideas with others using the "Share Your Brain" feature. Share your insights and collaborate directly within the app.

---

## 🖼️ UI Components & Functionality

The **UI** of Second Brain is built with flexibility in mind, allowing users to interact with content in different ways. The sidebar and dynamic card components allow users to filter and display specific content based on the selected category. Here's a breakdown of the key components:

### 🃏 **Card Components**
- **Card Design:** Each note or content item is displayed in a card format for a neat, visual representation. Cards can include:
  - Title of the content
  - Thumbnail (representing the relevant link or content, like an image or video preview)
  - Tags, creation date, and other metadata
  - Action buttons for further interaction (e.g., "Edit," "Delete")
  
### 🔄 **Content Filter via Sidebar**
- **Dynamic Content Display:** Depending on the category selected in the sidebar (YouTube, Document, All), the content cards will dynamically update to show only relevant notes or content. This allows users to easily filter and access specific types of information.
  - **YouTube:** Clicking on the "YouTube" section will display cards related to YouTube content, such as video, or links to related YouTube content.
  - **Document:** Clicking on the "Document" section will display card related to both Twitter and Notion — including tweet links and notes from Notion-based documents.
  - **All:** Displays all available content across all categories.

### 🧩 **"Share Your Brain" Functionality**
- Users can click on the "Share Brain" button to share their saved cards (links) with others. This feature makes it easy to collaborate and showcase your thoughts, bookmarks, or areas of interest — all in a neat card format.

---

## 📸 Screenshots

Here’s a quick peek at how the app looks:

### 🧳 **SignUp and Signin Page**
![SignUp and Signin Page](https://github.com/SUMITSUNWAL/Second-Brain/blob/c857eec0ffd6ba1cca90600175cb1a2921983815/Screenshot1.png?raw=true)

### 🧠 **Home Interface**
![Home Interface](https://github.com/SUMITSUNWAL/Second-Brain/blob/c857eec0ffd6ba1cca90600175cb1a2921983815/Screenshot2.png?raw=true)

### 🧳 **Add New Card – Modal Interface**
![Add New Card – Modal Interface](https://github.com/SUMITSUNWAL/Second-Brain/blob/c857eec0ffd6ba1cca90600175cb1a2921983815/Screenshot3.png?raw=true)


---

## 🚀 How to Use

1. **Clone the repository:**

   ```bash
   git clone https://github.com/SUMITSUNWAL/Second-Brain.git
   cd Second-Brain
   ```

2. **Install dependencies:**

   ```bash
   # root
   npm install
   # then for server
   cd Server && npm install
   ```

3. **(Optional) Enable Playwright rendering for better JS-heavy page extraction** ⚠️

   Some pages (for example, Instagram posts or JS-heavy sites) require a headless browser to fully render content before summary extraction. The app supports Playwright-based rendering as an optional feature.

   - Install browsers (if not installed automatically):
     ```bash
     cd Server && npx playwright install --with-deps
     ```
   - Enable Playwright by setting the environment variable `PLAYWRIGHT_ENABLED=true` (for example in `Server/.env` or export it in your environment). Example `.env` entry:
     ```ini
     PLAYWRIGHT_ENABLED=true
     ```
   - Restart the server. The server will warm up the Playwright browser on start (reduces first-request latency).

   Note: Playwright uses headless browser binaries — ensure your environment (CI, container, or host) supports running headless Chrome/Chromium.

