import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Accordion from "@radix-ui/react-accordion";
import type { ReactNode } from "react";
import { IconCheck, IconChevron } from "./icons";

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <Switch.Root className="switch" checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label}>
      <Switch.Thumb className="switch-thumb" />
    </Switch.Root>
  );
}

export function Confirm({
  trigger, title, description, action, onConfirm,
}: { trigger: ReactNode; title: string; description: string; action: string; onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dlg-overlay" />
        <AlertDialog.Content className="dlg">
          <AlertDialog.Title className="dlg-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dlg-desc">{description}</AlertDialog.Description>
          <div className="dlg-actions">
            <AlertDialog.Cancel asChild><button className="chip-btn">Cancelar</button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><button className="chip-btn danger-solid" onClick={onConfirm}>{action}</button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Dropdown<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger className="select-trigger" aria-label={label}>
        <Select.Value />
        <Select.Icon><IconChevron size={16} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={6}>
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className="select-item">
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator className="select-check"><IconCheck size={16} /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export const Acc = {
  Root: Accordion.Root,
  Item({ value, title, children }: { value: string; title: string; children: ReactNode }) {
    return (
      <Accordion.Item value={value} className="acc">
        <Accordion.Header asChild>
          <h3 style={{ margin: 0 }}>
            <Accordion.Trigger className="acc-trigger">
              {title}
              <IconChevron size={18} className="acc-chevron" />
            </Accordion.Trigger>
          </h3>
        </Accordion.Header>
        <Accordion.Content className="acc-content">
          <div className="acc-body">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    );
  },
};
