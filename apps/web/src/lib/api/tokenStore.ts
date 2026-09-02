/** Access token só em memória: nunca em localStorage. Some ao fechar a aba; o refresh cookie restaura. */
let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};
