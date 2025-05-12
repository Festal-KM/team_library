'use client'

import React from 'react'

interface TagBadgeProps {
  tag: string
}

export default function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
      {tag}
    </span>
  )
} 