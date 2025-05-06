"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface EditCityModalProps {
  isOpen: boolean
  currentCity: string
  onClose: () => void
  onSave: (newCity: string) => void
  placeholder?: string
}

export default function EditCityModal({
  isOpen,
  currentCity,
  onClose,
  onSave,
  placeholder = "Enter city name",
}: EditCityModalProps) {
  const [editedCity, setEditedCity] = useState(currentCity)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedCity(currentCity)
    if (isOpen && inputRef.current) {
      // Focus and select text when modal opens and currentCity is set
      setTimeout(() => {
        // Timeout to ensure focus works after dialog is fully rendered
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [currentCity, isOpen])

  const handleSave = () => {
    if (editedCity.trim()) {
      onSave(editedCity.trim())
    } else {
      onSave(currentCity) // If empty, save the original city or handle as error
    }
    // onClose(); // The onSave handler in page.tsx will typically close the modal
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedCity(event.target.value)
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit City Name</DialogTitle>
          <DialogDescription>
            Update the city you want to find sunny spots in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            ref={inputRef}
            id="cityName"
            value={editedCity}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
