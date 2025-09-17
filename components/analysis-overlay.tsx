"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface AnalysisOverlayProps {
  isOpen: boolean
  message: string
  progress: number
  eta?: string
}

export function AnalysisOverlay({ isOpen, message, progress, eta }: AnalysisOverlayProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <div className="flex flex-col items-center space-y-6 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-secondary" />

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Processing Your Quote Request</h3>
            <p className="text-muted text-sm">{message}</p>
          </div>

          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted">
              <span>{progress}% complete</span>
              {eta && <span>ETA: {eta}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
