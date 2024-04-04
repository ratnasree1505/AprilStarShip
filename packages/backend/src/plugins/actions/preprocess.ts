import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';

export const createPreprocessAction = () => {
  return createTemplateAction<{ repository_name: string; owner: string }>({
    id: 'mckesson:preprocess',
    schema: {
      input: {
        required: ['owner'],
        type: 'object',
        properties: {
          repository_name: {
            title: 'Repository Name',
            type: 'string',
          },
          owner: {
            title: 'Owner',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const { repository_name, owner } = ctx.input;

      if (repository_name) {
        const splitRepo = repository_name.split('-');
        const directoryName = splitRepo
          .map(x => x.charAt(0).toUpperCase() + x.substr(1))
          .join('');

        ctx.output('directoryName', directoryName);

        const packageFriendlyName = splitRepo
          .map(x => x.toLowerCase())
          .join('');

        ctx.output('packageFriendlyName', packageFriendlyName);
      }

      let codeowner;
      if (owner.toLowerCase().startsWith('user:')) {
        const [, username] = owner.split(':');
        codeowner = username;
      } else {
        codeowner = `mckesson/${owner}`;
      }
      ctx.output('codeowner', codeowner);
    },
  });
};