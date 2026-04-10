#!/usr/bin/env python3
"""
Generate icon.png files for all AICC plugins.
Each icon is 128x128 with a distinctive color, rounded corners,
the plugin category icon, and a short label.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

PLUGINS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Plugin → (bg_color, fg_color, symbol, short_label)
PLUGIN_ICONS = {
    'aicc-core':           ('#1a1a2e', '#e94560', '*', 'CORE'),
    'aicc-admin':          ('#2c3e50', '#f1c40f', 'A', 'ADMIN'),
    'aicc-amazon':         ('#ff9900', '#232f3e', 'A', 'AMZ'),
    'aicc-audio':          ('#6c3483', '#ffffff', 'A', 'AUDIO'),
    'aicc-bootstrap-developer': ('#7952b3', '#ffffff', 'B', 'BOOT'),
    'aicc-business':       ('#1a237e', '#ffc107', 'B', 'BIZ'),
    'aicc-calendly':       ('#006bff', '#ffffff', 'C', 'CAL'),
    'aicc-canva':          ('#7d2ae8', '#ffffff', 'C', 'CANVA'),
    'aicc-capcut':         ('#000000', '#ffffff', 'C', 'CUT'),
    'aicc-confluence':     ('#0052cc', '#ffffff', 'C', 'CNFL'),
    'aicc-css-developer':  ('#264de4', '#ffffff', 'C', 'CSS'),
    'aicc-data-converter': ('#2c3e50', '#1abc9c', 'D', 'DATA'),
    'aicc-discord':        ('#5865f2', '#ffffff', 'D', 'DSCD'),
    'aicc-diskimager':     ('#34495e', '#ecf0f1', 'D', 'DISK'),
    'aicc-email':          ('#d44638', '#ffffff', '@', 'EMAIL'),
    'aicc-esp-manager':    ('#00979d', '#ffffff', 'E', 'ESP'),
    'aicc-etsy':           ('#f1641e', '#ffffff', 'E', 'ETSY'),
    'aicc-facebook':       ('#1877f2', '#ffffff', 'f', 'FB'),
    'aicc-flow':           ('#00897b', '#ffffff', 'F', 'FLOW'),
    'aicc-game-development': ('#9c27b0', '#00e676', 'G', 'GAME'),
    'aicc-gamma':          ('#8b5cf6', '#ffffff', 'G', 'GAMMA'),
    'aicc-gemini':         ('#4285f4', '#ffffff', 'G', 'GEMNI'),
    'aicc-image':          ('#27ae60', '#ffffff', 'I', 'IMAGE'),
    'aicc-instagram':      ('#e1306c', '#ffffff', 'I', 'IG'),
    'aicc-jira':           ('#0052cc', '#ffffff', 'J', 'JIRA'),
    'aicc-kafka':          ('#231f20', '#ffffff', 'K', 'KAFKA'),
    'aicc-linkedin':       ('#0077b5', '#ffffff', 'in', 'LI'),
    'aicc-mailchimp':      ('#ffe01b', '#241c15', 'M', 'MC'),
    'aicc-marketing':      ('#e91e63', '#ffffff', 'M', 'MRKT'),
    'aicc-meetup':         ('#ed1c40', '#ffffff', 'M', 'MTUP'),
    'aicc-model':          ('#16a085', '#ffffff', 'M', 'MODEL'),
    'aicc-mysql-developer': ('#00758f', '#f29111', 'M', 'MySQL'),
    'aicc-openai':         ('#412991', '#ffffff', 'O', 'OAI'),
    'aicc-outlook':        ('#0078d4', '#ffffff', 'O', 'OUTLK'),
    'aicc-php-developer':  ('#777bb4', '#ffffff', 'P', 'PHP'),
    'aicc-rag':            ('#8e44ad', '#ffffff', 'R', 'RAG'),
    'aicc-reddit':         ('#ff4500', '#ffffff', 'R', 'RDDT'),
    'aicc-salesforce':     ('#00a1e0', '#ffffff', 'S', 'SF'),
    'aicc-seo-report':     ('#2ecc71', '#ffffff', 'S', 'SEO'),
    'aicc-sharepoint':     ('#038387', '#ffffff', 'S', 'SP'),
    'aicc-slack':          ('#4a154b', '#ffffff', '#', 'SLACK'),
    'aicc-speechify':      ('#f39c12', '#ffffff', 'S', 'SPFY'),
    'aicc-teams':          ('#6264a7', '#ffffff', 'T', 'TEAMS'),
    'aicc-threads':        ('#000000', '#ffffff', '@', 'THRDS'),
    'aicc-tiktok':         ('#010101', '#69c9d0', 'T', 'TKTK'),
    'aicc-timetap':        ('#3498db', '#ffffff', 'T', 'TTAP'),
    'aicc-translator':     ('#e67e22', '#ffffff', 'T', 'TRANS'),
    'aicc-twilio':         ('#f22f46', '#ffffff', 'T', 'TWLO'),
    'aicc-twitter':        ('#000000', '#ffffff', 'X', 'X'),
    'aicc-video':          ('#c0392b', '#ffffff', 'V', 'VIDEO'),
    'aicc-vonage':         ('#000000', '#ffffff', 'V', 'VNGE'),
    'aicc-web-crawl':      ('#2c3e50', '#3498db', 'W', 'CRAWL'),
    'aicc-whatsapp':       ('#25d366', '#ffffff', 'W', 'WA'),
    'aicc-woocommerce':    ('#96588a', '#ffffff', 'W', 'WOO'),
    'aicc-wordpress':      ('#21759b', '#ffffff', 'W', 'WP'),
    'aicc-youtube':        ('#ff0000', '#ffffff', '>', 'YT'),
    'aicc-zoom':           ('#2d8cff', '#ffffff', 'Z', 'ZOOM'),
}

SIZE = 128
CORNER_RADIUS = 24


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_rounded_rect_mask(size, radius):
    """Create a mask for rounded corners."""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=radius, fill=255)
    return mask


def create_icon(plugin_name, bg_hex, fg_hex, symbol, label):
    """Create a 128x128 icon with rounded corners, symbol, and label."""
    bg = hex_to_rgb(bg_hex)
    fg = hex_to_rgb(fg_hex)
    
    # Create image
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [(0, 0), (SIZE-1, SIZE-1)],
        radius=CORNER_RADIUS,
        fill=bg + (255,)
    )
    
    # Load fonts
    symbol_font = None
    label_font = None
    font_paths = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        'C:\\Windows\\Fonts\\arialbd.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                symbol_font = ImageFont.truetype(fp, 56)
                label_font = ImageFont.truetype(fp, 16)
                break
            except Exception:
                continue
    
    if symbol_font is None:
        symbol_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
    
    # Draw large symbol centered
    bbox = draw.textbbox((0, 0), symbol, font=symbol_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (SIZE - tw) // 2
    y = (SIZE - th) // 2 - 12
    draw.text((x, y), symbol, fill=fg + (255,), font=symbol_font)
    
    # Draw label at bottom
    bbox = draw.textbbox((0, 0), label, font=label_font)
    tw = bbox[2] - bbox[0]
    x = (SIZE - tw) // 2
    y = SIZE - 28
    draw.text((x, y), label, fill=fg + (180,), font=label_font)
    
    return img


def main():
    created = 0
    for plugin_name, (bg, fg, symbol, label) in PLUGIN_ICONS.items():
        plugin_dir = os.path.join(PLUGINS_DIR, plugin_name)
        if not os.path.isdir(plugin_dir):
            print(f'  ⚠ {plugin_name}/ not found — skipping')
            continue
        
        icon_path = os.path.join(plugin_dir, 'icon.png')
        img = create_icon(plugin_name, bg, fg, symbol, label)
        img.save(icon_path, 'PNG')
        print(f'  ✓ {plugin_name}/icon.png')
        created += 1
    
    print(f'\nCreated {created} icon.png files')


if __name__ == '__main__':
    main()
