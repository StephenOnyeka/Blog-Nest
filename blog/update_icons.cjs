const fs = require('fs');
const path = require('path');

const files = [
    'src/components/ArticleCard.tsx',
    'src/components/Navbar.tsx',
    'src/components/Sidebar.tsx',
    'src/pages/ArticlePage.tsx',
    'src/pages/HomePage.tsx',
    'src/pages/ProfilePage.tsx',
    'src/pages/SearchPage.tsx',
    'src/pages/WritePage.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Find import statement for iconsax-react
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]iconsax-react['"]/g;
    let match = importRegex.exec(content);
    if (!match) continue;

    const importsText = match[1];
    const icons = [];
    importsText.split(',').forEach(item => {
        let clean = item.trim();
        if (!clean) return;
        if (clean.includes(' as ')) {
            icons.push(clean.split(' as ')[1].trim());
        } else {
            icons.push(clean);
        }
    });

    icons.forEach(icon => {
        // Regex to match <IconName ... > or <IconName ... /> without variant attribute
        const pattern = new RegExp(`<${icon}\\b[^>]*>`, 'g');
        content = content.replace(pattern, (tagContent) => {
            if (!tagContent.includes('variant=')) {
                if (tagContent.endsWith('/>')) {
                    return tagContent.slice(0, -2) + ' variant="Linear" color="currentColor" />';
                } else {
                    return tagContent.slice(0, -1) + ' variant="Linear" color="currentColor">';
                }
            }
            return tagContent;
        });
    });

    fs.writeFileSync(file, content, 'utf8');
}
console.log('Done');
