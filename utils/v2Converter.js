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

function convertToV2(options, force = false, existingAttachments = []) {
  if (!options) return options;
  
  // If it's a string, it's just content
  if (typeof options === "string") {
    if (force) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options));
      return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
      };
    }
    return { content: options };
  }

  // Skip V2 conversion if explicitly requested
  if (options.skipV2) {
    const cleanOptions = { ...options };
    delete cleanOptions.skipV2;
    if (cleanOptions.ephemeral) {
      cleanOptions.flags = (cleanOptions.flags || 0) | MessageFlags.Ephemeral;
      delete cleanOptions.ephemeral;
    }
    return cleanOptions;
  }

  // If there are no embeds, return original options untouched, UNLESS forced V2 is required
  const hasEmbeds = options.embeds && options.embeds.length > 0;
  if (!force && !hasEmbeds) {
    const cleanOptions = { ...options };
    if (cleanOptions.ephemeral) {
      cleanOptions.flags = (cleanOptions.flags || 0) | MessageFlags.Ephemeral;
      delete cleanOptions.ephemeral;
    }
    return cleanOptions;
  }

  const newOptions = { ...options };
  if (newOptions.ephemeral) {
    newOptions.flags = (newOptions.flags || 0) | MessageFlags.Ephemeral;
    delete newOptions.ephemeral;
  }
  const originalEmbeds = newOptions.embeds || [];
  delete newOptions.embeds;

  // Extract content if present and delete it from root options to prevent MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2
  let rootContent = "";
  if (newOptions.content) {
    rootContent = newOptions.content;
    delete newOptions.content;
  }

  const containers = [];
  let isFirst = true;

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

    // Prepend root content to the first container
    if (isFirst && rootContent) {
      contentText += `${rootContent}\n\n`;
      isFirst = false;
    }

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
      contentText += `### ${data.title}\n`;
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
      for (let url of mediaUrls) {
        if (url && url.startsWith("attachment://")) {
          const filename = url.slice("attachment://".length);
          const existing = existingAttachments.find((att) => att.name === filename);
          if (existing) {
            url = existing.url;
          }
        }
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

  if (containers.length === 0) {
    if (rootContent) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(rootContent));
      containers.push(container);
    } else if (newOptions.components && newOptions.components.length > 0) {
      const container = new ContainerBuilder();
      containers.push(container);
    } else {
      newOptions.embeds = originalEmbeds;
      return newOptions;
    }
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

    const isInteraction = this.constructor && this.constructor.name.includes("Interaction");
    const isMessage = this.constructor && this.constructor.name === "Message";

    // Determine if the message or interaction has V2 components
    let hasV2 = false;
    if (methodName === "edit" && isMessage) {
      hasV2 = (this.flags && this.flags.has && this.flags.has(MessageFlags.IsComponentsV2)) || !!this._hasV2;
    } else if (methodName === "update" && isInteraction && this.message) {
      hasV2 = (this.message.flags && this.message.flags.has && this.message.flags.has(MessageFlags.IsComponentsV2)) || !!this.message._hasV2;
    } else if (methodName === "editReply" && isInteraction) {
      hasV2 = !!this._hasV2;
    }

    let existingAttachments = [];
    if (hasV2) {
      if (isMessage && this.attachments) {
        existingAttachments = Array.from(this.attachments.values());
      } else if (isInteraction && this.message?.attachments) {
        existingAttachments = Array.from(this.message.attachments.values());
      }
    }

    const cleanContentNull = (obj) => {
      if (obj && typeof obj === "object") {
        if (obj.content === null) obj.content = "";
        if (obj.options && typeof obj.options === "object") {
          if (obj.options.content === null) obj.options.content = "";
        }
      }
      return obj;
    };

    if (options && typeof options === "object") {
      convertedOptions = cleanContentNull(convertToV2(options, hasV2, existingAttachments));
    } else if (typeof options === "string" && args[0] && typeof args[0] === "object") {
      convertedArgs = [cleanContentNull(convertToV2(args[0], hasV2, existingAttachments)), ...args.slice(1)];
    }


    // If it has V2 components, we must explicitly clear them if the new payload doesn't provide them
    if (hasV2) {
      if (typeof convertedOptions === "string") {
        convertedOptions = {
          content: convertedOptions,
          embeds: [],
          components: []
        };
      } else if (convertedOptions && typeof convertedOptions === "object") {
        if (convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload") {
          // It's a MessagePayload instance, modify its options property directly
          if (!convertedOptions.options) {
            convertedOptions.options = {};
          }
          if (!convertedOptions.options.components) {
            convertedOptions.options.components = [];
          }
          if (!convertedOptions.options.embeds) {
            convertedOptions.options.embeds = [];
          }
        } else {
          // Create a shallow copy to avoid mutating a potentially frozen object
          convertedOptions = { ...convertedOptions };
          if (!convertedOptions.components) {
            convertedOptions.components = [];
          }
          if (!convertedOptions.embeds) {
            convertedOptions.embeds = [];
          }
        }

        // Preserve existing attachments for edit/update V2 payloads if not uploading new files
        const hasFiles = convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload"
          ? (convertedOptions.options?.files && convertedOptions.options.files.length > 0)
          : (convertedOptions.files && convertedOptions.files.length > 0);

        const hasAttachments = convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload"
          ? !!convertedOptions.options?.attachments
          : !!convertedOptions.attachments;

        if (!hasFiles && !hasAttachments) {
          let existingAttachments = [];
          if (isMessage && this.attachments) {
            existingAttachments = Array.from(this.attachments.values());
          } else if (isInteraction && this.message?.attachments) {
            existingAttachments = Array.from(this.message.attachments.values());
          }

          if (existingAttachments.length > 0) {
            const mappedAttachments = existingAttachments.map((att) => ({ id: att.id }));
            if (convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload") {
              convertedOptions.options.attachments = mappedAttachments;
            } else {
              convertedOptions.attachments = mappedAttachments;
            }
          }
        }
      }
    }

    // Check if the current payload is sending V2 components
    const isSendingV2 = convertedOptions && typeof convertedOptions === "object" && 
      ((convertedOptions.flags & MessageFlags.IsComponentsV2) || (convertedOptions.components && convertedOptions.components.length > 0));

    if (isSendingV2) {
      if (methodName === "edit" && isMessage) {
        this._hasV2 = true;
      } else if (isInteraction && (methodName === "reply" || methodName === "editReply" || methodName === "update")) {
        this._hasV2 = true;
      }
      if (this.message) {
        this.message._hasV2 = true;
      }

      // Discord API forbids sending embeds (even empty array) in V2 components payload
      if (convertedOptions && typeof convertedOptions === "object") {
        if (convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload") {
          if (convertedOptions.options) {
            delete convertedOptions.options.embeds;
          }
        } else {
          delete convertedOptions.embeds;
        }
      }
    }
    // If the message has V2 components, but the new payload doesn't, we must clear the IsComponentsV2 flag
    if (hasV2 && !isSendingV2) {
      if (convertedOptions && typeof convertedOptions === "object") {
        if (convertedOptions.constructor && convertedOptions.constructor.name === "MessagePayload") {
          if (!convertedOptions.options) {
            convertedOptions.options = {};
          }
          const currentFlags = convertedOptions.options.flags || 0;
          convertedOptions.options.flags = currentFlags & ~MessageFlags.IsComponentsV2;
        } else {
          const currentFlags = convertedOptions.flags || 0;
          convertedOptions.flags = currentFlags & ~MessageFlags.IsComponentsV2;
        }
      }
    }

    const result = original.call(this, convertedOptions, ...convertedArgs);

    if (result instanceof Promise) {
      let promise = result.catch((error) => {
        if (isInteraction && (error?.code === 40060 || error?.code === 10062) && methodName === "reply") {
          return this.followUp(convertedOptions, ...convertedArgs).catch(() => {});
        }
        throw error;
      });

      if (isSendingV2) {
        promise = promise.then((res) => {
          if (res) {
            res._hasV2 = true;
          }
          return res;
        });
      }
      return promise;
    }

    return result;
  };
}

// Apply patches
Message.prototype.reply = function (options, ...args) {
  return this.channel.send(options, ...args);
};

patchMethod(Message, "edit");


patchMethod(BaseGuildTextChannel, "send");
patchMethod(DMChannel, "send");
patchMethod(ThreadChannel, "send");
patchMethod(User, "send");

patchMethod(CommandInteraction, "reply");
patchMethod(CommandInteraction, "followUp");
patchMethod(CommandInteraction, "editReply");

patchMethod(MessageComponentInteraction, "reply");
patchMethod(MessageComponentInteraction, "followUp");
patchMethod(MessageComponentInteraction, "editReply");
patchMethod(MessageComponentInteraction, "update");

patchMethod(ModalSubmitInteraction, "reply");
patchMethod(ModalSubmitInteraction, "followUp");
patchMethod(ModalSubmitInteraction, "editReply");

console.log("🛠️ Component V2 Global Converter successfully initialized!");
