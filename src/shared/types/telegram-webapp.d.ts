interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  onEvent: (eventType: string, handler: () => void) => void;
  offEvent: (eventType: string, handler: () => void) => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
