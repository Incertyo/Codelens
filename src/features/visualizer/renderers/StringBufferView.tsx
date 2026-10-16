'use client';
import type { StringModel } from "@/features/visualizer/detectors";
import { LinearCells, ViewFrame, type ViewProps } from "./shared";
export function StringBufferView(props: ViewProps<StringModel>) {
  return (
    <ViewFrame model={props.model}>
      <LinearCells {...props} />
    </ViewFrame>
  );
}
