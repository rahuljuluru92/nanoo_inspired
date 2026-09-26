"use client";

import { markNotificationsReadAction } from "@/app/notifications-actions";
import { Icon } from "@/components/ui/icon";
import { LocalTime } from "@/components/ui/local-time";
import { Popover } from "@/components/ui/popover";
import { SubmitButton } from "@/components/ui/submit-button";

export interface NotificationItem {
  id: string;
  at: string;
  body: string;
  read: boolean;
}

/** The bell: latest notifications, unread ones marked, and one button to clear them. */
export function NotificationsMenu({ items, unread }: { items: NotificationItem[]; unread: number }) {
  return (
    <Popover
      label="Notifications"
      className="w-[min(92vw,22rem)] p-0"
      trigger={
        <button type="button" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative -mr-3 inline-flex size-11 items-center justify-center hover:text-vermilion-ink">
          <Icon name="bell" />
          {unread ? <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-vermilion" /> : null}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <p className="font-serif text-title">Notifications</p>
        {unread ? (
          <form action={markNotificationsReadAction}>
            <SubmitButton size="sm" variant="ghost">
              Mark all read
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-small text-muted">Nothing yet. Offers, drafts and payouts show up here.</p>
      ) : (
        <ul className="max-h-[60dvh] overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className={n.read ? "border-b border-line px-4 py-3 text-small text-muted" : "border-b border-line bg-highlight/25 px-4 py-3 text-small"}>
              <p>{n.body}</p>
              <p className="mt-0.5 font-mono text-caption text-muted">
                <LocalTime iso={n.at} mode="ago" />
              </p>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
