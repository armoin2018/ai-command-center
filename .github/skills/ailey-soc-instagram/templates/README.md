# Instagram Content Templates

Reusable templates for consistent Instagram content creation using Handlebars.

## Usage

```javascript
import Handlebars from 'handlebars';
import fs from 'fs';

const template = Handlebars.compile(
  fs.readFileSync('templates/product-launch.hbs', 'utf8')
);

const caption = template({
  productName: 'Amazing Product',
  description: 'Product description here',
  features: ['Feature 1', 'Feature 2', 'Feature 3'],
  price: '$99.99',
  hashtags: '#product #launch #new'
});
```

## Available Templates

### Post Templates

- **product-launch.hbs**: Product announcements and launches
- **testimonial.hbs**: Customer testimonials and reviews
- **behind-the-scenes.hbs**: BTS content and process reveals
- **tip-tutorial.hbs**: Educational tips and tutorials
- **quote.hbs**: Motivational quotes and sayings
- **announcement.hbs**: General announcements and updates
- **contest-giveaway.hbs**: Contest and giveaway posts

### Caption Templates

- **standard-caption.hbs**: General purpose caption
- **question-engagement.hbs**: Question to drive engagement
- **cta-shop.hbs**: Call-to-action for shopping
- **cta-link.hbs**: Call-to-action for link in bio
- **story-caption.hbs**: Narrative storytelling caption

### Hashtag Sets

Located in `hashtag-sets.json` - organized by industry and topic.

---

## Customization

Edit templates to match your brand voice and style. Use Handlebars syntax for dynamic content:

- `{{variable}}` - Insert variable
- `{{#if condition}}...{{/if}}` - Conditional content
- `{{#each array}}...{{/each}}` - Loop over arrays
- `{{{html}}}` - Unescaped HTML/emojis
