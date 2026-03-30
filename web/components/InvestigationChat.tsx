"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, SendHorizontal, Trash2, Loader2 } from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { renderInlineMarkdown } from "@/lib/utils"

interface InvestigationChatProps {
  messages: ChatMessage[]
  isInvestigating: boolean
  onAsk: (question: string) => void
  onClear: () => void
  personName?: string
}

function getSuggestedQuestions(name: string) {
  return [
    `What did ${name} do today?`,
    `When did ${name} last eat?`,
    "Did anyone visit?",
    `Is ${name} sleeping well?`,
    "Any concerns today?",
  ]
}

export function InvestigationChat({
  messages,
  isInvestigating,
  onAsk,
  onClear,
  personName = "them",
}: InvestigationChatProps) {
  const SUGGESTED_QUESTIONS = getSuggestedQuestions(personName)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isInvestigating) return
    onAsk(trimmed)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Ask about {personName}
          </span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={onClear} title="Clear conversation">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && !isInvestigating && (
            <div className="text-center py-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Ask anything about {personName}&apos;s day
              </p>
              {/* Suggested questions */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => onAsk(q)}
                    className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed">
                  {msg.role === "assistant" ? renderInlineMarkdown(msg.content) : msg.content}
                </p>
                {msg.frames && msg.frames.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {msg.frames.map((f, i) => (
                      <img
                        key={i}
                        src={`data:image/jpeg;base64,${f.frame}`}
                        alt="Context frame"
                        className="w-20 h-14 object-cover rounded-lg border border-border/50"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isInvestigating && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName}...`}
            disabled={isInvestigating}
            className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            className="rounded-xl shrink-0"
            onClick={handleSubmit}
            disabled={!input.trim() || isInvestigating}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
