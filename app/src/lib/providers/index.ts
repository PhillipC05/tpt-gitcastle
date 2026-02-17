/**
 * Git Provider System
 * 
 * This module provides a pluggable architecture for supporting multiple Git hosting providers.
 * Each provider implements the IGitProvider interface and handles provider-specific operations.
 */

export * from './provider-interface'
export * from './github-provider'
export * from './gitcastle-provider'
export * from './provider-factory'
