import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Flex, Skeleton, Text, VisuallyHidden } from "@radix-ui/themes";
import { CollectionEntry, qualityColor } from "./collection-helpers";

// A mount or pet and its creature render. Toys and appearances have no render: Blizzard only has
// their small icons, so they have no preview.
export interface PreviewTarget {
  entry: CollectionEntry;
  image: string;
  // the row that opened the preview, which gets focus back when it closes
  trigger?: HTMLElement;
}

function RenderPreview({ image, name }: { image: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <Text size="2" color="gray">Blizzard has no picture of this one yet.</Text>;
  return (
    <div className="forever-render-preview">
      {!loaded && <Skeleton className="forever-render-skeleton" />}
      <img src={image} alt={name} style={{ opacity: loaded ? 1 : 0 }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  );
}

export default function CollectionPreview({ target, onClose }: { target?: PreviewTarget; onClose: () => void }) {
  const entry = target?.entry;
  // target is cleared as the dialog starts closing, before Radix moves focus, so the row is kept here
  const trigger = useRef<HTMLElement>(undefined);
  useEffect(() => { if (target?.trigger) trigger.current = target.trigger; }, [target]);
  return (
    <Dialog.Root open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Content maxWidth="420px" className="forever-collection-preview"
        onCloseAutoFocus={(event) => { if (trigger.current?.isConnected) { event.preventDefault(); trigger.current.focus(); } }}>
        {entry && target && <>
          <Dialog.Title size="4" mb="1" color={qualityColor(entry.quality)}>{entry.name}</Dialog.Title>
          {entry.detail ? <Dialog.Description size="2" color="gray" mb="3">{entry.detail}</Dialog.Description>
            : <VisuallyHidden><Dialog.Description>Picture of {entry.name}</Dialog.Description></VisuallyHidden>}
          <RenderPreview key={target.image} image={target.image} name={entry.name} />
          <Flex justify="end" mt="4">
            <Dialog.Close><Button variant="soft" color="gray">Close</Button></Dialog.Close>
          </Flex>
        </>}
      </Dialog.Content>
    </Dialog.Root>
  );
}
