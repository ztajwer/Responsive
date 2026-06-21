"use client";

import { useEffect } from "react";

/** Home locks body scroll; detail pages use window/body as the single scroll container. */
export default function DetailPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverflowX: html.style.overflowX,
      htmlOverflowY: html.style.overflowY,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyOverflowX: body.style.overflowX,
      bodyOverflowY: body.style.overflowY,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
    };

    html.classList.add("detail-page-scroll");
    body.classList.add("detail-page-scroll");
    html.style.overflowX = "hidden";
    html.style.overflowY = "auto";
    html.style.height = "auto";
    body.style.overflowX = "hidden";
    body.style.overflowY = "auto";
    body.style.height = "auto";
    body.style.position = "relative";

    return () => {
      html.classList.remove("detail-page-scroll");
      body.classList.remove("detail-page-scroll");
      html.style.overflow = prev.htmlOverflow;
      html.style.overflowX = prev.htmlOverflowX;
      html.style.overflowY = prev.htmlOverflowY;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.overflowX = prev.bodyOverflowX;
      body.style.overflowY = prev.bodyOverflowY;
      body.style.height = prev.bodyHeight;
      body.style.position = prev.bodyPosition;
    };
  }, []);

  return null;
}
