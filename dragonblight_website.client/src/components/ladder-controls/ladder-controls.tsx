import { FC, ReactNode, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, SegmentedControl, Skeleton, Table } from "@radix-ui/themes";
import { Pagination } from "react-headless-pagination";
import { Dragonblight } from "../../clients/Dragonblight";
import DialogCloseButton from "../dialog-close-button/dialog-close-button";
import "./ladder-controls.css";

//The controls the rankings and activity tables have in common.

interface RegionToggleProps {
  defaultValue: string;
  disabled: boolean;
  onSelect: (region: string) => void;
}

export const RegionToggle: FC<RegionToggleProps> = (props) => {
  let wrapperClass = "";
  if (props.disabled) {
    wrapperClass = "div-disabled";
  }
  return (
    <div className={wrapperClass}>
      <SegmentedControl.Root className="w-[100px] grow-0" defaultValue={props.defaultValue}>
        <SegmentedControl.Item onClick={() => props.onSelect("us")} value="us">
          US
        </SegmentedControl.Item>
        <SegmentedControl.Item onClick={() => props.onSelect("eu")} value="eu">
          EU
        </SegmentedControl.Item>
      </SegmentedControl.Root>
    </div>
  );
};

const paginationStyles = {
  compact: {
    arrowButton: "bg-[#292c31] mx-1 h-[28px] w-[28px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-xs first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ",
    inactivePage: "bg-transparent h-[28px] w-[28px] flex justify-center items-center text-center first:rounded-s-md last:rounded-e-md text-gray-800 hover:bg-gray-100 py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10",
    activePage: "h-[28px] w-[28px] flex justify-center items-center text-center bg-gray-200 first:rounded-s-md last:rounded-e-md text-gray-800  py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-600 dark:border-neutral-700 dark:text-white dark:focus:bg-neutral-500",
    page: "mx-px",
    truncableText: " ... ",
  },
  large: {
    arrowButton: "bg-[#292c31] mx-2 min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ",
    inactivePage: "bg-[#292c31] min-h-[38px] min-w-[38px] flex justify-center items-center border border-gray-200 text-gray-800 hover:bg-gray-100 py-2 px-3 text-sm first:rounded-s-lg last:rounded-e-lg focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10",
    activePage: " min-h-[38px] min-w-[38px] flex justify-center items-center bg-gray-200 text-gray-800 border border-gray-200 py-2 px-3 text-sm first:rounded-s-lg last:rounded-e-lg focus:outline-hidden focus:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-600 dark:border-neutral-700 dark:text-white dark:focus:bg-neutral-500",
    page: "mx-1",
    truncableText: " - ",
  },
};

const PageArrow: FC<{ path: string }> = (props) => (
  <svg
    className="shrink-0 size-3.5"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={props.path}></path>
  </svg>
);

interface LadderPaginationProps {
  page: number;
  onPageChange: (page: number) => void;
  size: keyof typeof paginationStyles;
  className: string;
  navClassName: string;
  //shows which characters are on this page, next to the buttons
  showCount?: boolean;
}

export const LadderPagination: FC<LadderPaginationProps> = (props) => {
  const styles = paginationStyles[props.size];
  return (
    <Pagination
      currentPage={props.page}
      totalPages={100}
      edgePageCount={1}
      middlePagesSiblingCount={1}
      setCurrentPage={props.onPageChange}
      className={props.className}
      truncableText={styles.truncableText}
      truncableClassName=""
    >
      <nav className={props.navClassName}>
        {props.showCount && (
          <span className="font-bold flex flex-1 text-sm items-center">
            Showing {props.page * 50 + 1} - {(props.page + 1) * 50} Characters
          </span>
        )}
        <ul className="flex items-center">
          <Pagination.PrevButton className={styles.arrowButton}>
            <PageArrow path="m15 18-6-6 6-6" />
          </Pagination.PrevButton>
          <Pagination.PageButton
            inactiveClassName={styles.inactivePage}
            activeClassName={styles.activePage}
            className={styles.page}
          />
          <Pagination.NextButton className={styles.arrowButton}>
            <PageArrow path="m9 18 6-6-6-6" />
          </Pagination.NextButton>
        </ul>
      </nav>
    </Pagination>
  );
};

//placeholder rows while a ladder page loads
export const LadderSkeletonRows: FC = () => (
  <>
    {[0, 1, 2].map((row) => (
      <Table.Row key={"skeleton" + row}>
        <Table.Cell>
          <Skeleton></Skeleton>
        </Table.Cell>
        <Table.Cell>
          <Skeleton></Skeleton>
        </Table.Cell>
        <Table.Cell>
          <Skeleton></Skeleton>
        </Table.Cell>
        {/* only three columns show on mobile */}
        {[3, 4, 5].map((cell) => (
          <Table.Cell key={cell} className="desktopOnly">
            <Skeleton></Skeleton>
          </Table.Cell>
        ))}
      </Table.Row>
    ))}
  </>
);

interface MobileDetailsDialogProps {
  region: string;
  realm: string | undefined;
  characterName: string | undefined;
  children: ReactNode;
}

//the "View" button and popup a ladder row uses on mobile, where its columns are hidden
export const MobileDetailsDialog: FC<MobileDetailsDialogProps> = (props) => {
  const [image, setImage] = useState<string>();

  //a ladder page has 50 rows, so a character's image is only fetched once its popup opens
  function loadImage(open: boolean) {
    if (!open || image || !props.realm || !props.characterName) {
      return;
    }
    new Dragonblight.ProfileClient()
      .getCharacterImage(props.realm, props.characterName, props.region)
      .then((url) => setImage(url || undefined))
      .catch(() => setImage(undefined));
  }

  return (
    <Dialog.Root onOpenChange={loadImage}>
      <Dialog.Trigger asChild>
        <Button className="z-10 mobile-view-button" variant="outline">
          View
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="backdrop-blur-sm data-[state=open]:animate-overlayShow fixed inset-0" />
        <Dialog.Content className="mobile-details-dialog data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] w-[90vw] max-h-[85vh] overflow-x-hidden overflow-y-auto translate-x-[-50%] translate-y-[-50%] shadow-[hsl(206_22%_7%/35%)_0px_10px_38px_-10px,hsl(206_22%_7%/20%)_0px_10px_20px_-15px] focus:outline-hidden">
          {image && <img src={image} alt="" className="mobile-details-image" onError={() => setImage(undefined)} />}
          <div className="mobile-details-body">
            <DialogCloseButton />
            <div className="mobile-details-rows">{props.children}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

interface MobileDetailRowProps {
  label: string;
  valueClassName?: string;
  children: ReactNode;
}

export const MobileDetailRow: FC<MobileDetailRowProps> = (props) => {
  let valueClass = "mobile-details-value";
  if (props.valueClassName) {
    valueClass += " " + props.valueClassName;
  }
  return (
    <div className="mobile-details-row">
      <span className="mobile-details-label">{props.label}</span>
      <span className={valueClass}>{props.children}</span>
    </div>
  );
};
