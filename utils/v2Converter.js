const {
  Message,
  BaseGuildTextChannel,
  DMChannel,
  ThreadChannel,
  User,
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  ThumbnailBuilder
} = require("discord.js");

function convertToV2(options) {
  if (!options) return options;
  
  // If it's a string, it's just content
  if (typeof options === "string") {
    return { content: options };
  }

  // Skip V2 conversion if explicitly requested
  if (options.skipV2) {
    const cleanOptions = { ...options };
    delete cleanOptions.skipV2;
    return cleanOptions;
  }

  // If there are no embeds, return original options untouched
  if (!options.embeds || options.embeds.length === 0) {
    return options;
  }

  const newOptions = { ...options };
  const originalEmbeds = newOptions.embeds;
  delete newOptions.embeds;

  const containers = [];

  for (const embed of originalEmbeds) {
    if (!embed) continue;
    
    // Convert EmbedBuilder or plain API embed object to JSON
    const data = typeof embed.toJSON === "function" ? embed.toJSON() : embed;

    const container = new ContainerBuilder();
    if (data.color) {
      container.setAccentColor(data.color);
    }

    // 1. Author (if has iconURL, render as Section; otherwise prepend to contentText)
    let authorSection = null;
    let contentText = "";

    if (data.author?.name) {
      if (data.author.iconURL) {
        authorSection = new SectionBuilder();
        authorSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(data.author.iconURL));
        authorSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${data.author.name}**`));
      } else {
        contentText += `**${data.author.name}**\n`;
      }
    }

    if (data.title) {
      contentText += `# ${data.title}\n`;
    }
    if (data.description) {
      contentText += `${data.description}\n`;
    }
    contentText = contentText.trim();

    if (authorSection) {
      container.addSectionComponents(authorSection);
    }
    if (contentText) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(contentText));
    }

    // 2. Fields
    if (data.fields && data.fields.length > 0) {
      for (const field of data.fields) {
        if (container.components && container.components.length > 0) {
          container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }
        const fieldText = `### ${field.name}\n${field.value}`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fieldText));
      }
    }

    // 3. Media (Image and Thumbnail)
    const mediaUrls = [];
    if (data.image?.url) mediaUrls.push(data.image.url);
    if (data.thumbnail?.url) mediaUrls.push(data.thumbnail.url);

    if (mediaUrls.length > 0) {
      const gallery = new MediaGalleryBuilder();
      for (const url of mediaUrls) {
        gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
      }
      container.addMediaGalleryComponents(gallery);
    }

    // 4. Footer
    if (data.footer?.text) {
      if (container.components && container.components.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
      }
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${data.footer.text}*`));
    }

    containers.push(container);
  }

  // 5. Merge existing action rows/components into the first container
  if (newOptions.components && newOptions.components.length > 0 && containers.length > 0) {
    const firstContainer = containers[0];
    const originalComponents = newOptions.components;
    
    // Clear original components so we don't send them twice
    newOptions.components = [];
    
    for (const component of originalComponents) {
      if (typeof firstContainer.addActionRowComponents === "function") {
        firstContainer.addActionRowComponents(component);
      }
    }
  }

  newOptions.components = containers;
  
  // Set the V2 flag
  newOptions.flags = (newOptions.flags || 0) | MessageFlags.IsComponentsV2;

  return newOptions;
}

// Monkeypatch helper
function patchMethod(target, methodName) {
  if (!target || !target.prototype || !target.prototype[methodName]) return;
  const original = target.prototype[methodName];
  target.prototype[methodName] = function (options, ...args) {
    let convertedOptions = options;
    let convertedArgs = args;

    if (options && typeof options === "object") {
      convertedOptions = convertToV2(options);
    } else if (typeof options === "string" && args[0] && typeof args[0] === "object") {
      convertedArgs = [convertToV2(args[0]), ...args.slice(1)];
    }

    return original.call(this, convertedOptions, ...convertedArgs);
  };
}

// Apply patches
patchMethod(Message, "reply");
patchMethod(Message, "edit");
patchMethod(BaseGuildTextChannel, "send");
patchMethod(DMChannel, "send");
patchMethod(ThreadChannel, "send");
patchMethod(User, "send");
patchMethod(CommandInteraction, "reply");
patchMethod(CommandInteraction, "followUp");
patchMethod(MessageComponentInteraction, "reply");
patchMethod(MessageComponentInteraction, "followUp");
patchMethod(MessageComponentInteraction, "update");
patchMethod(ModalSubmitInteraction, "reply");
patchMethod(ModalSubmitInteraction, "followUp");

console.log("🛠️ Component V2 Global Converter successfully initialized!");
